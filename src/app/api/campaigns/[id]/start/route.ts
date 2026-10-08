import { NextResponse } from "next/server";
import { initialCampaigns } from "@/lib/data/store";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function POST(
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

  // Forward start command to n8n
  const n8nResult = await forwardToN8n(env.N8N_CAMPAIGN_START_WEBHOOK, {
    method: "POST",
    body: {
      action: "start",
      campaignId: id,
      templateId: campaign.templateId,
      audience: campaign.audience,
      variables: campaign.variables,
    },
  });

  campaign.status = "Running";
  campaign.startedAt = new Date().toISOString();

  return NextResponse.json({
    success: true,
    data: campaign,
    n8nStatus: n8nResult.success ? "queued" : "n8n_failed_fallback_active",
    message: "Campaign started successfully",
  });
}
