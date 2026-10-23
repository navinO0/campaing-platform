import { NextResponse } from "next/server";
import { recordClientReminderInDb, getClientByIdFromDb, updateClientInDb } from "@/lib/db";
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
      bannerUrl,
      qrCodeUrl,
      paymentConfig,
      choiceOptions,
      buttons,
      scheduleType = "immediate",
      scheduledAt,
      recurringRule,
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

    // Clean phone number for WhatsApp (remove + and spaces, ensure country code)
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    // Effective media URL (banner image prioritized, then QR code, then mediaUrl)
    const effectiveMediaUrl = bannerUrl || mediaUrl || (paymentConfig?.enabled ? qrCodeUrl : undefined);

    // If recurring or scheduled in the future:
    if (scheduleType === "scheduled" || scheduleType === "recurring") {
      const nextRun = scheduledAt ? new Date(scheduledAt).toISOString() : new Date(Date.now() + 86400000).toISOString();

      // Save schedule on client record
      await updateClientInDb(clientId, {
        reminderSchedule: {
          type: scheduleType,
          scheduledAt: scheduledAt || undefined,
          recurring: recurringRule || undefined,
        },
      });

      // Record scheduled reminder entry
      const reminderRecord = await recordClientReminderInDb({
        clientId,
        clientTemplateId,
        phone,
        clientName: clientName || "Valued Client",
        renderedMessage: fullText,
        status: "scheduled",
        scheduleType,
        scheduledAt: scheduledAt || null,
        recurringRule: recurringRule || null,
        nextRunAt: nextRun,
      });

      return NextResponse.json({
        success: true,
        message: scheduleType === "recurring"
          ? `Recurring reminder schedule activated for ${phone}`
          : `Reminder scheduled for ${phone} on ${new Date(scheduledAt).toLocaleString()}`,
        data: reminderRecord,
      });
    }

    // Otherwise: Immediate Dispatch
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
        const timeout = setTimeout(() => controller.abort(), 10000);

        const evoEndpoint = effectiveMediaUrl
          ? `${evoUrl}/message/sendMedia/${encodeURIComponent(evoInstance)}`
          : `${evoUrl}/message/sendText/${encodeURIComponent(evoInstance)}`;

        // Evolution API v2: root-level fields for both sendMedia and sendText
        const evoPayload = effectiveMediaUrl
          ? {
              number: cleanPhone,
              mediatype: "image",
              media: effectiveMediaUrl,
              caption: fullText,
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
          dispatchStatus = "sent";
        } else {
          const errData = await res.text();
          console.warn("Evolution API responded with non-200:", errData);
          dispatchError = `Provider HTTP ${res.status}: ${errData}`;

          // If sendMedia failed, gracefully fall back to sendText so the message is never lost
          if (effectiveMediaUrl) {
            try {
              const textRes = await fetch(`${evoUrl}/message/sendText/${encodeURIComponent(evoInstance)}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: evoKey,
                },
                body: JSON.stringify({
                  number: cleanPhone,
                  text: fullText,
                  linkPreview: true,
                }),
              });
              if (textRes.ok) {
                const textData = await textRes.json();
                evolutionMessageId = textData.key?.id || textData.id || `EVO_${Date.now()}`;
                dispatchError = null;
                dispatchStatus = "sent";
              }
            } catch (fallbackErr: any) {
              console.warn("Fallback to text message also failed:", fallbackErr.message);
            }
          }
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
          bannerUrl,
          qrCodeUrl,
          paymentConfig,
          choiceOptions,
          buttons,
        },
      }).catch(() => null);
    }

    // 3. Record reminder dispatch log in PostgreSQL
    const finalStatus = evolutionMessageId ? "sent" : (dispatchError ? "failed" : "sent");
    const reminderRecord = await recordClientReminderInDb({
      clientId,
      clientTemplateId,
      phone,
      clientName: clientName || "Valued Client",
      renderedMessage: fullText,
      status: finalStatus,
      scheduleType: "immediate",
      evolutionMessageId,
      errorMessage: dispatchError,
    });

    if (!evolutionMessageId && dispatchError) {
      return NextResponse.json({
        success: false,
        error: {
          code: "PROVIDER_ERROR",
          message: `WhatsApp provider delivery failed: ${dispatchError}`,
        },
        data: reminderRecord,
      }, { status: 400 });
    }

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
