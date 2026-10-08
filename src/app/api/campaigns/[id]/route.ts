import { NextResponse } from "next/server";
import { initialCampaigns, initialCampaignLogs } from "@/lib/data/store";
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
