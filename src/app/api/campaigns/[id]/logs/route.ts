import { NextResponse } from "next/server";
import { initialCampaignLogs } from "@/lib/data/store";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  // Attempt to fetch from n8n logs webhook
  const n8nResult = await forwardToN8n<typeof initialCampaignLogs>(
    env.N8N_CAMPAIGN_LOGS_WEBHOOK,
    {
      method: "POST",
      body: { campaignId: id, status: statusFilter },
      timeoutMs: 4000,
    }
  );

  let logs = n8nResult.success && n8nResult.data && Array.isArray(n8nResult.data)
    ? n8nResult.data
    : initialCampaignLogs.filter((l) => l.campaignId === id);

  if (statusFilter) {
    logs = logs.filter((l) => l.status === statusFilter);
  }

  return NextResponse.json({
    success: true,
    data: logs,
  });
}
