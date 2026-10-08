import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { forwardToN8n } from "@/lib/api/n8n-client";

export async function POST() {
  const result = await forwardToN8n<{ status?: string; message?: string }>(
    env.N8N_CAMPAIGN_STATUS_WEBHOOK,
    {
      method: "POST",
      body: { action: "health_ping", timestamp: Date.now() },
      timeoutMs: 5000,
    }
  );

  return NextResponse.json({
    success: result.success,
    n8nBaseUrl: env.N8N_BASE_URL,
    webhookTested: env.N8N_CAMPAIGN_STATUS_WEBHOOK,
    status: result.success ? "connected" : "error",
    error: result.error,
    requestId: result.requestId,
  });
}
