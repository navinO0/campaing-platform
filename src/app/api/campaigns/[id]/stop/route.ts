import { NextResponse } from "next/server";
import { getCampaignByIdFromDb, setCampaignStatusInDb, pool } from "@/lib/db";
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

    // Mandatory Kill Switch instruction to n8n
    const n8nResult = await forwardToN8n(env.N8N_CAMPAIGN_STOP_WEBHOOK, {
      method: "POST",
      body: {
        action: "stop",
        campaignId: id,
        reason: "Emergency kill switch initiated by user",
        timestamp: Date.now(),
      },
    }).catch(() => ({ success: false }));

    // Cancel remaining pending jobs in database
    await pool.query(
      `UPDATE whatsapp_campaign.campaign_jobs SET status = 'cancelled', updated_at = NOW() WHERE campaign_id = $1 AND status = 'pending';`,
      [id]
    );

    const updated = await setCampaignStatusInDb(id, "Cancelled");

    return NextResponse.json({
      success: true,
      data: updated,
      n8nAcknowledged: n8nResult.success,
      message: "Campaign stopped immediately via kill switch",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
