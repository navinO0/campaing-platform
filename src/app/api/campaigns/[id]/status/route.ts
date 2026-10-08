import { NextResponse } from "next/server";
import { initialCampaigns } from "@/lib/data/store";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaign = initialCampaigns.find((c) => c.id === id);

  if (!campaign) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
      { status: 404 }
    );
  }

  // Poll n8n for updated delivery stats
  const n8nResult = await forwardToN8n<{
    stats?: typeof campaign.stats;
    status?: typeof campaign.status;
  }>(env.N8N_CAMPAIGN_STATUS_WEBHOOK, {
    method: "POST",
    body: { campaignId: id },
    timeoutMs: 4000,
  });

  if (n8nResult.success && n8nResult.data) {
    if (n8nResult.data.stats) campaign.stats = { ...campaign.stats, ...n8nResult.data.stats };
    if (n8nResult.data.status) campaign.status = n8nResult.data.status;
  }

  return NextResponse.json({
    success: true,
    data: {
      campaignId: campaign.id,
      status: campaign.status,
      stats: campaign.stats,
    },
  });
}
