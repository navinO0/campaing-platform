import { NextResponse } from "next/server";
import { normalizePhoneNumber } from "@/lib/validation";
import { checkOtpRateLimit } from "@/lib/db";
import { env } from "@/config/env";

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

    // Check cooldown
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
            message: `Please wait ${rateLimit.retryAfterSeconds} seconds before requesting another code.`,
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
        },
        { status: 429 }
      );
    }

    // Forward to /api/otp/send internally
    const url = new URL("/api/otp/send", request.url);
    const forwardRes = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized, purpose, templateId }),
    });

    const forwardJson = await forwardRes.json();
    return NextResponse.json(forwardJson, { status: forwardRes.status });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
