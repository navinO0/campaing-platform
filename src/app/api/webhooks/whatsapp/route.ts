import { NextResponse } from "next/server";
import { env } from "@/config/env";
import {
  recordWebhookLogInDb,
  updateOtpDeliveryStatus,
  pool,
} from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/security";

/**
 * GET /api/webhooks/whatsapp
 * Meta WhatsApp Cloud API & Evolution API Webhook Handshake Verification.
 * Returns hub.challenge if hub.verify_token matches configured WEBHOOK_VERIFY_TOKEN.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode") || searchParams.get("mode");
  const token = searchParams.get("hub.verify_token") || searchParams.get("token") || searchParams.get("verify_token");
  const challenge = searchParams.get("hub.challenge") || searchParams.get("challenge");

  const expectedToken = env.WEBHOOK_VERIFY_TOKEN || "whatsapp_verify_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("✅ Webhook verified successfully with challenge:", challenge);
    return new Response(challenge || "OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Also support simple ping verification
  if (token === expectedToken) {
    return new Response(challenge || "OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("❌ Webhook verification failed. Invalid token received:", token);
  return new Response("Forbidden: Invalid verify token", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Receives incoming WhatsApp event notifications:
 * - Delivery receipt updates (sent, delivered, read, failed)
 * - Inbound messages & quick-reply button clicks
 * - Logs raw payload into whatsapp_campaign.webhook_logs
 * - Updates delivery status in otp_verifications and campaign_jobs
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  let rawBody = "";

  try {
    rawBody = await request.text();
    const signature =
      request.headers.get("x-hub-signature-256") ||
      request.headers.get("x-webhook-signature") ||
      "";

    // Optional signature check if secret configured and signature provided
    const webhookSecret = env.N8N_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn("⚠️ Webhook signature mismatch");
        await recordWebhookLogInDb({
          eventType: "SIGNATURE_MISMATCH",
          source: "whatsapp",
          payload: { error: "Signature verification failed", headers: Object.fromEntries(request.headers) },
          processed: false,
          errorMessage: "Invalid HMAC signature",
        });
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};

    // Determine event source and event type
    const eventType =
      payload.event ||
      payload.type ||
      (payload.entry ? "META_STATUS_UPDATE" : "UNKNOWN_EVENT");
    const source = payload.entry ? "meta_cloud_api" : "evolution";

    // 1. Process delivery receipts (Evolution API or Meta Cloud API format)
    let messageId: string | null = null;
    let status: string | null = null;

    // Evolution API format: { event: "messages.update", data: { key: { id: "..." }, status: "DELIVERY_ACK" } }
    if (payload.data?.key?.id) {
      messageId = payload.data.key.id;
      const evoStatus = (payload.data.status || payload.event || "").toUpperCase();
      if (evoStatus.includes("DELIVERY") || evoStatus === "DELIVERED") status = "delivered";
      else if (evoStatus.includes("READ") || evoStatus === "PLAYED") status = "read";
      else if (evoStatus.includes("ERROR") || evoStatus.includes("FAIL")) status = "failed";
      else if (evoStatus.includes("SENT")) status = "sent";
    }

    // Meta Cloud API format: { entry: [{ changes: [{ value: { statuses: [{ id: "...", status: "delivered" }] } }] }] }
    if (payload.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]) {
      const metaStatus = payload.entry[0].changes[0].value.statuses[0];
      messageId = metaStatus.id;
      status = metaStatus.status; // 'sent', 'delivered', 'read', 'failed'
    }

    // 2. If status was extracted, update OTP verification & campaign job records
    if (messageId && status) {
      // Update OTP delivery status
      await updateOtpDeliveryStatus(messageId, status);

      // Update Campaign jobs delivery status if applicable
      const now = new Date();
      if (status === "delivered") {
        await pool.query(
          `UPDATE whatsapp_campaign.campaign_jobs
           SET status = 'delivered', delivered_at = $1, updated_at = $1
           WHERE evolution_message_id = $2;`,
          [now, messageId]
        );
      } else if (status === "read") {
        await pool.query(
          `UPDATE whatsapp_campaign.campaign_jobs
           SET status = 'read', read_at = $1, updated_at = $1
           WHERE evolution_message_id = $2;`,
          [now, messageId]
        );
      } else if (status === "failed") {
        await pool.query(
          `UPDATE whatsapp_campaign.campaign_jobs
           SET status = 'failed', updated_at = $1
           WHERE evolution_message_id = $2;`,
          [now, messageId]
        );
      }
    }

    // 3. Record audit log in database
    await recordWebhookLogInDb({
      eventType: String(eventType),
      source,
      payload,
      processed: true,
    });

    return NextResponse.json({
      success: true,
      processed: true,
      matchedMessageId: messageId,
      statusExtracted: status,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (err: unknown) {
    console.error("Webhook processing error:", err);
    await recordWebhookLogInDb({
      eventType: "ERROR",
      source: "whatsapp",
      payload: { rawBody: rawBody.slice(0, 1000) },
      processed: false,
      errorMessage: (err as Error).message,
    }).catch(() => null);

    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
