import { env } from "@/config/env";
import { generateHmacSignature, generateRequestId, logServerAction } from "@/lib/security";
import type { ApiResponse } from "@/types";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  idempotent?: boolean;
}

export class N8nClientError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(message: string, statusCode = 500, code = "N8N_ERROR", details?: unknown) {
    super(message);
    this.name = "N8nClientError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function forwardToN8n<T>(
  webhookPath: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "POST",
    body,
    headers: customHeaders = {},
    timeoutMs = env.N8N_REQUEST_TIMEOUT_MS,
    retries = options.idempotent ? env.N8N_MAX_RETRIES : 0,
  } = options;

  const url = `${env.N8N_BASE_URL.replace(/\/+$/, "")}/${webhookPath.replace(/^\/+/, "")}`;
  const requestId = generateRequestId();
  const startTime = Date.now();

  const bodyString = body ? JSON.stringify(body) : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
    ...customHeaders,
  };

  if (env.N8N_API_KEY) {
    headers["Authorization"] = `Bearer ${env.N8N_API_KEY}`;
  }

  if (env.N8N_WEBHOOK_SECRET && bodyString) {
    headers["X-Webhook-Signature"] = generateHmacSignature(bodyString, env.N8N_WEBHOOK_SECRET);
  }

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: bodyString || undefined,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      let responseData: unknown = null;
      try {
        responseData = await response.json();
      } catch {
        // If not JSON, text response
        const text = await response.text().catch(() => "");
        responseData = { message: text };
      }

      logServerAction({
        requestId,
        endpoint: webhookPath,
        durationMs,
        status: response.status,
      });

      if (!response.ok) {
        throw new N8nClientError(
          (responseData as { message?: string })?.message || `n8n responded with status ${response.status}`,
          response.status,
          `HTTP_${response.status}`,
          responseData
        );
      }

      return {
        success: true,
        data: responseData as T,
        requestId,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      lastError = err;

      // Only retry if idempotent and not the final attempt
      if (attempt <= retries) {
        const backoffMs = Math.pow(2, attempt) * 500;
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const isTimeout = (lastError as { name?: string })?.name === "AbortError";
  const statusCode = isTimeout ? 504 : (lastError as N8nClientError)?.statusCode || 502;
  const errorCode = isTimeout ? "GATEWAY_TIMEOUT" : "N8N_UNAVAILABLE";
  const errorMessage = isTimeout
    ? "n8n request timed out"
    : (lastError as Error)?.message || "Failed to communicate with n8n server";

  logServerAction({
    requestId,
    endpoint: webhookPath,
    durationMs,
    status: statusCode,
    errorCode,
    message: errorMessage,
  });

  return {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      details: (lastError as N8nClientError)?.details,
    },
    requestId,
  };
}
