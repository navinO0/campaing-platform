import { NextResponse } from "next/server";
import { getCampaignByIdFromDb } from "@/lib/db";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function GET(
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

    // Optional status webhook query to n8n
    forwardToN8n(env.N8N_CAMPAIGN_STATUS_WEBHOOK, {
      method: "POST",
      body: { campaignId: id },
      timeoutMs: 3000,
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        status: campaign.status,
        stats: campaign.stats,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
