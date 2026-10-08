import { NextResponse } from "next/server";
import { getCampaignByIdFromDb, updateCampaignInDb, deleteCampaignFromDb } from "@/lib/db";
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
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();

    const updated = await updateCampaignInDb(id, {
      name: json.name,
      description: json.description,
      variables: json.variables,
      throttling: json.throttling,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    forwardToN8n(env.N8N_CAMPAIGNS_WEBHOOK, {
      method: "POST",
      body: { action: "update", campaign: updated },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: updated,
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
  try {
    const { id } = await params;
    const deleted = await deleteCampaignFromDb(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    forwardToN8n(env.N8N_CAMPAIGNS_WEBHOOK, {
      method: "POST",
      body: { action: "delete", campaignId: id },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
