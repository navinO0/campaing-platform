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

  // Mandatory Kill Switch instruction to n8n
  const n8nResult = await forwardToN8n(env.N8N_CAMPAIGN_STOP_WEBHOOK, {
    method: "POST",
    body: {
      action: "stop",
      campaignId: id,
      reason: "Emergency kill switch initiated by user",
      timestamp: Date.now(),
    },
  });

  campaign.status = "Cancelled";
  campaign.completedAt = new Date().toISOString();

  return NextResponse.json({
    success: true,
    data: campaign,
    n8nAcknowledged: n8nResult.success,
    message: "Campaign stopped immediately via n8n kill switch",
  });
}
