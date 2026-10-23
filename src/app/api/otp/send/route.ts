import { NextResponse } from "next/server";
import { normalizePhoneNumber } from "@/lib/validation";
import {
  generateSecureOtp,
  generateSalt,
  hashOtp,
} from "@/lib/security";
import {
  createOtpVerificationInDb,
  checkOtpRateLimit,
  markOtpSuperseded,
} from "@/lib/db";
import { env } from "@/config/env";
import { forwardToN8n } from "@/lib/api/n8n-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, purpose = "authentication", templateId = "tpl_auth_otp_login_01" } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PHONE", message: "Mobile phone number is required" } },
        { status: 400 }
      );
    }

    const { normalized, isValid } = normalizePhoneNumber(phone);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PHONE", message: "Invalid phone number format" } },
        { status: 400 }
      );
    }

    // 1. Rate Limiting Check (Anti-Abuse / SMS Pumping prevention)
    const rateLimit = await checkOtpRateLimit(
      normalized,
      env.OTP_RATE_LIMIT_WINDOW_SECONDS || 900,
      env.OTP_RATE_LIMIT_MAX_REQUESTS || 5
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many OTP requests. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
        },
        { status: 429 }
      );
    }

    // 2. Mark any previously active pending OTP for this number & purpose as superseded
    await markOtpSuperseded(normalized, purpose);

    // 3. Cryptographic OTP generation
    const otpCode = generateSecureOtp(6);
    const salt = generateSalt(16);
    const otpHash = hashOtp(otpCode, salt);

    const expirySeconds = env.OTP_EXPIRY_SECONDS || 300; // 5 minutes
    const expiryMinutes = Math.ceil(expirySeconds / 60);
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);
    const appName = env.NEXT_PUBLIC_APP_NAME || "Campaign Pro";

    // 4. Construct WhatsApp Message text & copy code button
    const messageText = `Your ${appName} verification code is: *${otpCode}*.\n\n⏱️ This code will expire in ${expiryMinutes} minutes.\n\n⚠️ For your security, do not share this code with anyone.`;
    const cleanPhone = normalized.replace(/[^0-9]/g, "");

    let evolutionMessageId: string | null = null;
    let deliveryStatus = "queued";

    // 5. Dispatch via Evolution API if configured
    const evoUrl = (env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
    const evoKey = env.EVOLUTION_API_KEY;
    const evoInstance = env.EVOLUTION_INSTANCE_NAME || "Default";

    if (evoUrl && evoKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const evoRes = await fetch(`${evoUrl}/message/sendText/${encodeURIComponent(evoInstance)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: evoKey,
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: messageText,
            linkPreview: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (evoRes.ok) {
          const data = await evoRes.json();
          evolutionMessageId = data.key?.id || data.id || `EVO_OTP_${Date.now()}`;
          deliveryStatus = "sent";
        }
      } catch (evoErr) {
        console.warn("Evolution API direct dispatch note:", (evoErr as Error).message);
      }
    }

    // 6. Forward event to n8n if configured
    if (env.N8N_BASE_URL) {
      forwardToN8n(env.N8N_CAMPAIGN_START_WEBHOOK, {
        method: "POST",
        body: {
          action: "otp_dispatch",
          phone: cleanPhone,
          purpose,
          templateId,
        },
      }).catch(() => null);
    }

    // 7. Store verification record in PostgreSQL
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || null;
    const userAgent = request.headers.get("user-agent") || null;

    const verification = await createOtpVerificationInDb({
      phone: normalized,
      otpHash,
      salt,
      expiresAt,
      purpose,
      maxAttempts: env.OTP_MAX_ATTEMPTS || 3,
      evolutionMessageId: evolutionMessageId || undefined,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Verification OTP dispatched to ${normalized}`,
      data: {
        verificationId: verification.id,
        phone: normalized,
        expiresInSeconds: expirySeconds,
        cooldownSeconds: env.OTP_COOLDOWN_SECONDS || 60,
        purpose: verification.purpose,
        deliveryStatus: verification.deliveryStatus,
        createdAt: verification.createdAt,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

