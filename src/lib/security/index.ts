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
