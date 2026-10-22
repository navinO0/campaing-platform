import { NextResponse } from "next/server";
import { normalizePhoneNumber } from "@/lib/validation";
import { verifyOtpHash } from "@/lib/security";
import {
  getOtpVerificationById,
  getLatestActiveOtpByPhone,
  incrementOtpAttempts,
  markOtpVerified,
  markOtpExpired,
} from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { verificationId, phone, code, purpose = "authentication" } = body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_CODE", message: "Verification code is required" } },
        { status: 400 }
      );
    }

    // 1. Fetch OTP verification record
    let record = null;
    if (verificationId) {
      record = await getOtpVerificationById(verificationId);
    } else if (phone) {
      const { normalized } = normalizePhoneNumber(phone);
      record = await getLatestActiveOtpByPhone(normalized, purpose);
    } else {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_IDENTIFIER", message: "Either verificationId or phone must be provided" } },
        { status: 400 }
      );
    }

    if (!record) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "No active OTP verification found for this request. Please request a new code." } },
        { status: 404 }
      );
    }

    const { verification, otpHash, salt } = record;

    // 2. Check if already verified
    if (verification.status === "verified") {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_VERIFIED", message: "This code was already verified." } },
        { status: 400 }
      );
    }

    // 3. Check if attempts already exceeded
    if (verification.status === "max_attempts_exceeded") {
      return NextResponse.json(
        { success: false, error: { code: "MAX_ATTEMPTS_EXCEEDED", message: "Too many failed verification attempts. Please request a new code." } },
        { status: 400 }
      );
    }

    // 4. Check if expired
    const isExpired = new Date() > new Date(verification.expiresAt) || verification.status === "expired";
    if (isExpired) {
      await markOtpExpired(verification.id);
      return NextResponse.json(
        { success: false, error: { code: "OTP_EXPIRED", message: "This verification code has expired. Please request a new code." } },
        { status: 400 }
      );
    }

    // 5. Constant-time timing-safe hash comparison
    const isMatch = verifyOtpHash(code.trim(), salt, otpHash);

    if (isMatch) {
      const updated = await markOtpVerified(verification.id);
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Verification successful! Code verified.",
        data: {
          verificationId: verification.id,
          phone: verification.phone,
          purpose: verification.purpose,
          verifiedAt: updated?.verifiedAt,
        },
      });
    }

    // 6. Handle Invalid Code & Increment Attempts Counter
    const attemptResult = await incrementOtpAttempts(verification.id);
    const remaining = Math.max(0, attemptResult.maxAttempts - attemptResult.attempts);

    if (attemptResult.isLocked) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: {
            code: "MAX_ATTEMPTS_EXCEEDED",
            message: "Incorrect code. Maximum attempts exceeded. Please request a new verification code.",
            remainingAttempts: 0,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: {
          code: "INVALID_CODE",
          message: `Incorrect verification code. ${remaining} attempt(s) remaining.`,
          remainingAttempts: remaining,
        },
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
