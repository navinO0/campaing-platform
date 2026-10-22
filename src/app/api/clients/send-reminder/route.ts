import { NextResponse } from "next/server";
import { recordClientReminderInDb, getClientByIdFromDb } from "@/lib/db";
import { env } from "@/config/env";
import { forwardToN8n } from "@/lib/api/n8n-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientId,
      clientTemplateId,
      phone,
      clientName,
      message,
      headerText,
      footerText,
      mediaUrl,
    } = body;

    if (!clientId || !phone || !message) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Client ID, mobile phone number, and message text are required" } },
        { status: 400 }
      );
    }

    // Compose formatted text if header or footer provided
    let fullText = message;
    if (headerText) {
      fullText = `*${headerText.trim()}*\n\n${fullText}`;
    }
    if (footerText) {
      fullText = `${fullText}\n\n_${footerText.trim()}_`;
    }

    // Clean phone number for WhatsApp (remove + and spaces)
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    let evolutionMessageId: string | null = null;
    let dispatchStatus = "sent";
    let dispatchError: string | null = null;

    // 1. Attempt direct dispatch via Evolution API if configured
    const evoUrl = (env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
    const evoKey = env.EVOLUTION_API_KEY;
    const evoInstance = env.EVOLUTION_INSTANCE_NAME || "Default";

    if (evoUrl && evoKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const evoEndpoint = mediaUrl
          ? `${evoUrl}/message/sendMedia/${encodeURIComponent(evoInstance)}`
          : `${evoUrl}/message/sendText/${encodeURIComponent(evoInstance)}`;

        const evoPayload = mediaUrl
          ? {
              number: cleanPhone,
              mediaMessage: {
                mediatype: "image",
                caption: fullText,
                media: mediaUrl,
              },
            }
          : {
              number: cleanPhone,
              text: fullText,
              linkPreview: true,
            };

        const res = await fetch(evoEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: evoKey,
          },
          body: JSON.stringify(evoPayload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          evolutionMessageId = data.key?.id || data.id || `EVO_${Date.now()}`;
        } else {
          const errData = await res.text();
          console.warn("Evolution API responded with non-200:", errData);
          dispatchError = `Provider HTTP ${res.status}`;
        }
      } catch (evoErr: any) {
        console.warn("Could not dispatch via Evolution API directly:", evoErr.message);
        dispatchError = evoErr.message;
      }
    }

    // 2. Fallback notification to n8n if available
    if (env.N8N_BASE_URL) {
      forwardToN8n(env.N8N_CAMPAIGN_START_WEBHOOK, {
        method: "POST",
        body: {
          action: "single_client_reminder",
          clientId,
          phone: cleanPhone,
          message: fullText,
          templateId: clientTemplateId,
        },
      }).catch(() => null);
    }

    // 3. Record reminder dispatch log in PostgreSQL
    const reminderRecord = await recordClientReminderInDb({
      clientId,
      clientTemplateId,
      phone,
      clientName: clientName || "Valued Client",
      renderedMessage: fullText,
      status: evolutionMessageId ? "sent" : (dispatchError ? "queued" : "sent"),
      evolutionMessageId,
      errorMessage: dispatchError,
    });

    return NextResponse.json({
      success: true,
      message: `Reminder successfully sent to ${phone}`,
      data: reminderRecord,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
