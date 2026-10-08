import { NextResponse } from "next/server";
import { getCampaignByIdFromDb, setCampaignStatusInDb } from "@/lib/db";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await getCampaignByIdFromDb(id);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const updated = await setCampaignStatusInDb(id, "Running");

    // Forward start command to n8n start webhook
    const n8nResult = await forwardToN8n(env.N8N_CAMPAIGN_START_WEBHOOK, {
      method: "POST",
      body: {
        action: "start",
        campaignId: id,
        name: campaign.name,
        templateId: campaign.templateId,
        audience: campaign.audience,
        variables: campaign.variables,
        media: campaign.media,
        throttling: campaign.throttling,
      },
    }).catch(() => ({ success: false }));

    return NextResponse.json({
      success: true,
      data: updated,
      n8nStatus: n8nResult.success ? "queued" : "n8n_pending_cron_pickup",
      message: "Campaign started successfully and queued for execution",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
