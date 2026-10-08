import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Campaign } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaigns = db.getCampaigns();
  const campaign = campaigns.find((c) => c.id === id);

  if (!campaign) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Campaign not found" },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: campaign,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();

    const campaigns = db.getCampaigns();
    const index = campaigns.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    const updatedCampaign: Campaign = {
      ...campaigns[index],
      name: json.name || campaigns[index].name,
      description: json.description !== undefined ? json.description : campaigns[index].description,
      variables: json.variables || campaigns[index].variables,
      throttling: json.throttling || campaigns[index].throttling,
      updatedAt: new Date().toISOString(),
    };

    campaigns[index] = updatedCampaign;
    db.setCampaigns(campaigns);

    forwardToN8n(env.N8N_CAMPAIGNS_WEBHOOK, {
      method: "POST",
      body: { action: "update", campaign: updatedCampaign },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: updatedCampaign,
      message: "Campaign updated successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaigns = db.getCampaigns();
  const index = campaigns.findIndex((c) => c.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
      { status: 404 }
    );
  }

  const deleted = campaigns.splice(index, 1)[0];
  db.setCampaigns(campaigns);

  forwardToN8n(env.N8N_CAMPAIGNS_WEBHOOK, {
    method: "POST",
    body: { action: "delete", campaignId: id },
  }).catch(() => null);

  return NextResponse.json({
    success: true,
    data: deleted,
    message: "Campaign deleted successfully",
  });
}
