import { NextResponse } from "next/server";
import { recordClientReminderInDb, updateClientInDb } from "@/lib/db";
import { env } from "@/config/env";
import { forwardToN8n } from "@/lib/api/n8n-client";

// Clean media data URL or ensure clean base64 / URL for Evolution API
function sanitizeMedia(mediaStr: string): string {
  if (!mediaStr) return "";
  const trimmed = mediaStr.trim();
  if (trimmed.startsWith("data:image/")) {
    return trimmed.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  }
  return trimmed;
}

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

    // Clean phone number for WhatsApp (remove + and spaces, ensure country code)
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    // Compose formatted text using native WhatsApp markdown (Blockquotes, Lists, Bold, Monospace)
    // Optimized for iOS and Android WhatsApp native rendering (no breaking unicode box lines)
    let fullText = "";

    if (headerText) {
      fullText = `*${headerText.trim()}*\n\n${message.trim()}`;
    } else {
      fullText = message.trim();
    }

    // 1. Append Structured Payment Details Block if payment is enabled (and not unchecked/disabled)
    const isPaymentExplicitlyDisabled = paymentConfig && paymentConfig.enabled === false;
    const isPaymentEnabled = !isPaymentExplicitlyDisabled && Boolean(
      paymentConfig?.enabled || paymentConfig?.paymentLink || paymentConfig?.upiId || qrCodeUrl
    );

    if (isPaymentEnabled) {
      const payLines: string[] = [
        `\n\n> *PAYMENT DETAILS*`,
      ];
      if (paymentConfig?.amount) {
        const amtStr = Number(paymentConfig.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 });
        payLines.push(`- *Amount Due:* *₹${amtStr}*`);
      }
      if (paymentConfig?.upiId) {
        payLines.push(`- *Instant UPI ID:* \`${paymentConfig.upiId}\`\n_(Tap UPI ID to copy & pay via any UPI app)_`);
      }
      if (paymentConfig?.paymentLink) {
        payLines.push(`- *Pay Online Link:*\n${paymentConfig.paymentLink}`);
      }
      fullText = `${fullText}${payLines.join("\n")}`;
    }

    // 2. Append Action Buttons & Links Block (Direct payment links, call phone, coupon)
    if (Array.isArray(buttons) && buttons.length > 0) {
      const btnLines: string[] = [
        `\n\n> *QUICK ACTIONS*`,
      ];
      for (const btn of buttons) {
        if (!btn) continue;
        if (btn.type === "visit_website" && btn.url) {
          btnLines.push(`- *${btn.text || "Pay Online"}:* ${btn.url}`);
        } else if (btn.type === "call_phone" && btn.phoneNumber) {
          btnLines.push(`- *${btn.text || "Helpline"}:* ${btn.phoneNumber}`);
        } else if (btn.type === "copy_coupon" && (btn.url || btn.text)) {
          btnLines.push(`- *${btn.text}:* \`${btn.url || ""}\``);
        } else if (btn.url) {
          btnLines.push(`- *${btn.text || "Action Link"}:* ${btn.url}`);
        }
      }
      if (btnLines.length > 1) {
        fullText = `${fullText}${btnLines.join("\n")}`;
      }
    }

    // 3. Append Choice Options (Quick Reply Menu)
    if (Array.isArray(choiceOptions) && choiceOptions.length > 0) {
      const choiceLines: string[] = [
        `\n\n> *QUICK RESPONSE (Reply with number)*`,
      ];
      choiceOptions.forEach((opt: string, i: number) => {
        choiceLines.push(`${i + 1}. ${opt}`);
      });
      fullText = `${fullText}${choiceLines.join("\n")}`;
    }

    // 4. Append Footer
    if (footerText) {
      fullText = `${fullText}\n\n_${footerText.trim()}_`;
    }

    // Determine Effective Media & QR URLs
    const primaryBannerUrl = bannerUrl || mediaUrl;
    let effectiveQrUrl: string | null = null;

    // Only configure companion QR code if payment QR is NOT unchecked/disabled
    if (!isPaymentExplicitlyDisabled) {
      effectiveQrUrl = qrCodeUrl || paymentConfig?.qrCodeUrl || null;
      if (!effectiveQrUrl && paymentConfig?.enabled && paymentConfig?.upiId) {
        const amt = parseFloat(String(paymentConfig.amount)) || 0;
        const upiUri = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(
          paymentConfig.payeeName || clientName || "Valued Client"
        )}&am=${amt.toFixed(2)}&cu=INR`;
        effectiveQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;
      }
    }

    // If recurring or scheduled in the future:
    if (scheduleType === "scheduled" || scheduleType === "recurring") {
      const nextRun = scheduledAt ? new Date(scheduledAt).toISOString() : new Date(Date.now() + 86400000).toISOString();

      await updateClientInDb(clientId, {
        reminderSchedule: {
          type: scheduleType,
          scheduledAt: scheduledAt || undefined,
          recurring: recurringRule || undefined,
        },
      });

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

    // Otherwise: Immediate Dispatch via Evolution API
    let evolutionMessageId: string | null = null;
    let dispatchStatus = "sent";
    let dispatchError: string | null = null;

    const evoUrl = (env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
    const evoKey = env.EVOLUTION_API_KEY;
    const evoInstance = env.EVOLUTION_INSTANCE_NAME || "Default";

    if (evoUrl && evoKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        // Scenario A: Primary Banner Image is present
        if (primaryBannerUrl) {
          const sanitizedBanner = sanitizeMedia(primaryBannerUrl);
          const evoMediaEndpoint = `${evoUrl}/message/sendMedia/${encodeURIComponent(evoInstance)}`;

          const bannerRes = await fetch(evoMediaEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evoKey,
            },
            body: JSON.stringify({
              number: cleanPhone,
              mediatype: "image",
              media: sanitizedBanner,
              caption: fullText,
            }),
            signal: controller.signal,
          });

          if (bannerRes.ok) {
            const data = await bannerRes.json();
            evolutionMessageId = data.key?.id || data.id || `EVO_${Date.now()}`;
            dispatchStatus = "sent";

            // If Payment QR is also enabled, send the Payment QR Code as a companion image
            if (effectiveQrUrl) {
              try {
                const sanitizedQr = sanitizeMedia(effectiveQrUrl);
                const amtFormatted = paymentConfig?.amount
                  ? `₹${Number(paymentConfig.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : "";
                const qrCaption = [
                  `*📱 SCAN & PAY VIA ANY UPI APP*`,
                  `\n> *PAYMENT SUMMARY*`,
                  amtFormatted ? `- *Amount Payable:* *${amtFormatted}*` : "",
                  paymentConfig?.upiId ? `- *Instant UPI ID:* \`${paymentConfig.upiId}\`` : "",
                  paymentConfig?.payeeName ? `- *Payee:* ${paymentConfig.payeeName}` : "",
                  `- *Supported:* GPay • PhonePe • Paytm • BHIM • Cred`,
                  paymentConfig?.paymentLink ? `- *Online Link:* ${paymentConfig.paymentLink}` : "",
                  `\n_Scan this QR code with any mobile UPI payment app to settle instantly._`,
                ].filter(Boolean).join("\n");

                await fetch(evoMediaEndpoint, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: evoKey,
                  },
                  body: JSON.stringify({
                    number: cleanPhone,
                    mediatype: "image",
                    media: sanitizedQr,
                    caption: qrCaption,
                  }),
                });
              } catch (qrErr: any) {
                console.warn("Could not dispatch companion QR image:", qrErr.message);
              }
            }
          } else {
            const errData = await bannerRes.text();
            console.warn("Primary banner dispatch failed, falling back to text:", errData);

            // Fallback to text message so reminder is never lost
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

              // Attempt companion QR even if banner failed
              if (effectiveQrUrl) {
                try {
                  const sanitizedQr = sanitizeMedia(effectiveQrUrl);
                  await fetch(`${evoUrl}/message/sendMedia/${encodeURIComponent(evoInstance)}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", apikey: evoKey },
                    body: JSON.stringify({
                      number: cleanPhone,
                      mediatype: "image",
                      media: sanitizedQr,
                      caption: `📱 *Scan to Pay* via UPI ID: ${paymentConfig?.upiId || ""}`,
                    }),
                  });
                } catch {}
              }
            } else {
              dispatchError = `Provider HTTP ${bannerRes.status}: ${errData}`;
            }
          }
        }
        // Scenario B: No banner, but Payment QR code is present -> send QR as main media
        else if (effectiveQrUrl) {
          const sanitizedQr = sanitizeMedia(effectiveQrUrl);
          const evoMediaEndpoint = `${evoUrl}/message/sendMedia/${encodeURIComponent(evoInstance)}`;

          const qrRes = await fetch(evoMediaEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evoKey,
            },
            body: JSON.stringify({
              number: cleanPhone,
              mediatype: "image",
              media: sanitizedQr,
              caption: fullText,
            }),
            signal: controller.signal,
          });

          if (qrRes.ok) {
            const data = await qrRes.json();
            evolutionMessageId = data.key?.id || data.id || `EVO_${Date.now()}`;
            dispatchStatus = "sent";
          } else {
            const errData = await qrRes.text();
            console.warn("QR dispatch failed, falling back to text:", errData);
            const textRes = await fetch(`${evoUrl}/message/sendText/${encodeURIComponent(evoInstance)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: evoKey },
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
            } else {
              dispatchError = `Provider HTTP ${qrRes.status}: ${errData}`;
            }
          }
        }
        // Scenario C: Plain Text
        else {
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
            signal: controller.signal,
          });

          if (textRes.ok) {
            const data = await textRes.json();
            evolutionMessageId = data.key?.id || data.id || `EVO_${Date.now()}`;
            dispatchStatus = "sent";
          } else {
            const errData = await textRes.text();
            dispatchError = `Provider HTTP ${textRes.status}: ${errData}`;
          }
        }

        clearTimeout(timeout);
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
          qrCodeUrl: effectiveQrUrl,
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
