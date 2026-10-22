import crypto from "crypto";

export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length <= 4) return "****";
  const last4 = cleaned.slice(-4);
  return "*".repeat(cleaned.length - 4) + last4;
}

export function generateHmacSignature(payload: string, secret: string): string {
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function generateRequestId(): string {
  return "req_" + crypto.randomBytes(8).toString("hex") + "_" + Date.now();
}

/**
 * Generates a cryptographically secure random numeric OTP of specified length.
 * Standard is 6 digits (range 100000 - 999999).
 */
export function generateSecureOtp(digits: number = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(crypto.randomInt(min, max + 1));
}

/**
 * Generates a random cryptographic salt.
 */
export function generateSalt(length: number = 16): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Computes SHA-256 HMAC hash of the OTP code using salt.
 */
export function hashOtp(code: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(code.trim()).digest("hex");
}

/**
 * Timing-safe comparison to prevent timing side-channel attacks on OTP verification.
 */
export function verifyOtpHash(code: string, salt: string, expectedHash: string): boolean {
  if (!code || !salt || !expectedHash) return false;
  const computedHash = hashOtp(code, salt);
  const computedBuf = Buffer.from(computedHash, "hex");
  const expectedBuf = Buffer.from(expectedHash, "hex");
  if (computedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, expectedBuf);
}

/**
 * Verifies webhook payload signature (Meta X-Hub-Signature-256 or custom HMAC).
 */
export function verifyWebhookSignature(
  rawPayload: string,
  incomingSignature: string,
  secret: string
): boolean {
  if (!incomingSignature || !secret) return false;
  const cleanSig = incomingSignature.replace(/^sha256=/, "");
  const expectedSig = crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");
  const incomingBuf = Buffer.from(cleanSig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (incomingBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(incomingBuf, expectedBuf);
}

export interface StructuredLogPayload {
  requestId: string;
  endpoint: string;
  durationMs: number;
  status: number;
  errorCode?: string;
  message?: string;
}

export function logServerAction(payload: StructuredLogPayload) {
  const { requestId, endpoint, durationMs, status, errorCode, message } = payload;
  const timestamp = new Date().toISOString();
  console.log(
    JSON.stringify({
      level: status >= 400 ? "warn" : "info",
      timestamp,
      requestId,
      endpoint,
      durationMs,
      status,
      errorCode: errorCode || null,
      message: message || null,
    })
  );
}
