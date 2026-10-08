import { NextResponse } from "next/server";
import { db, initialTemplates } from "@/lib/data/store";
import { campaignSchema } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Campaign } from "@/types";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: db.getCampaigns(),
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const validated = campaignSchema.parse(json);

    const templates = db.getTemplates();
    const template = templates.find((t) => t.id === validated.templateId) || initialTemplates[0];

    const newCampaign: Campaign = {
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
        totalAudience: 5000,
        queued: 5000,
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

    if (validated.schedule.type === "immediate") {
      forwardToN8n(env.N8N_CAMPAIGN_START_WEBHOOK, {
        method: "POST",
        body: {
          campaignId: newCampaign.id,
          name: newCampaign.name,
          templateId: newCampaign.templateId,
          audience: newCampaign.audience,
          variables: newCampaign.variables,
          media: newCampaign.media,
          throttling: newCampaign.throttling,
        },
      }).catch((err) => {
        console.error("Non-blocking n8n webhook notification:", err);
      });
    }

    const campaigns = db.getCampaigns();
    campaigns.unshift(newCampaign);
    db.setCampaigns(campaigns);

    return NextResponse.json({
      success: true,
      data: newCampaign,
      message: "Campaign created and queued for execution",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: (err as Error).message,
        },
      },
      { status: 400 }
    );
  }
}
