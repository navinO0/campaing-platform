import { NextResponse } from "next/server";
import { getCampaignLogsFromDb } from "@/lib/db";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    // Retrieve real execution logs from PostgreSQL campaign_jobs table
    let logs = await getCampaignLogsFromDb(id);

    // Optional sync notification to n8n logs webhook
    forwardToN8n(env.N8N_CAMPAIGN_LOGS_WEBHOOK, {
      method: "POST",
      body: { campaignId: id, status: statusFilter },
      timeoutMs: 3000,
    }).catch(() => null);

    if (statusFilter) {
      logs = logs.filter((l) => l.status === statusFilter);
    }

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
