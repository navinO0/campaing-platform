import { NextResponse } from "next/server";
import { initialTemplates } from "@/lib/data/store";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Template } from "@/types";

export async function POST() {
  // Sync request to n8n which fetches from Evolution API or Meta Cloud
  const n8nResult = await forwardToN8n<{ templates?: Template[] }>(
    env.N8N_TEMPLATES_WEBHOOK,
    {
      method: "POST",
      body: { action: "sync_provider_templates" },
      timeoutMs: 8000,
    }
  );

  const syncedTemplates = n8nResult.success && n8nResult.data?.templates
    ? n8nResult.data.templates
    : initialTemplates;

  return NextResponse.json({
    success: true,
    data: syncedTemplates,
    count: syncedTemplates.length,
    message: n8nResult.success
      ? "Templates synchronized from WhatsApp provider successfully via n8n"
      : "Synchronized with local template repository (n8n fallback active)",
  });
}
