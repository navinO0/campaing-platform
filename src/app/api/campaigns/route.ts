import { NextResponse } from "next/server";
import { getCampaignsFromDb, createCampaignInDb, getTemplateByIdFromDb } from "@/lib/db";
import { campaignSchema } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Campaign } from "@/types";

export async function GET() {
  try {
    const campaigns = await getCampaignsFromDb();
    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (err: unknown) {
    console.error("Error retrieving campaigns:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: (err as Error).message,
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const validated = campaignSchema.parse(json);

    const template = await getTemplateByIdFromDb(validated.templateId);

    const newCampaignData: Campaign = {
      id: `cmp_${Date.now()}`,
      name: validated.name,
      description: validated.description,
      status: validated.schedule.type === "immediate" ? "Running" : "Scheduled",
      templateId: validated.templateId,
      templateName: template?.name || "Standard Template",
      audience: validated.audience,
      variables: validated.variables,
      media: validated.media?.type !== "none" && validated.media?.url ? {
        type: validated.media.type,
        url: validated.media.url,
        caption: validated.media.caption,
      } : undefined,
      tracking: validated.tracking,
      schedule: validated.schedule,
      throttling: validated.throttling,
      stats: {
        totalAudience: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        optedOut: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: validated.schedule.type === "immediate" ? new Date().toISOString() : null,
    };

    // Inserts campaign and creates individual campaign_jobs with idempotency keys
    const createdCampaign = await createCampaignInDb(newCampaignData);

    // Notify n8n start webhook asynchronously if immediate
    if (validated.schedule.type === "immediate") {
      forwardToN8n(env.N8N_CAMPAIGN_START_WEBHOOK, {
        method: "POST",
        body: {
          campaignId: createdCampaign.id,
          name: createdCampaign.name,
          templateId: createdCampaign.templateId,
          audience: createdCampaign.audience,
          variables: createdCampaign.variables,
          media: createdCampaign.media,
          throttling: createdCampaign.throttling,
        },
      }).catch((err) => {
        console.error("Non-blocking n8n webhook notification:", err);
      });
    }

    return NextResponse.json({
      success: true,
      data: createdCampaign,
      message: "Campaign created and pending jobs queued in PostgreSQL database",
    });
  } catch (err: unknown) {
    console.error("Error creating campaign:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_OR_DB_ERROR",
          message: (err as Error).message,
        },
      },
      { status: 400 }
    );
  }
}
