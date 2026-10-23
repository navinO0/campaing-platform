import { NextResponse } from "next/server";
import { getRecentWebhookLogsFromDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const logs = await getRecentWebhookLogsFromDb(limit);

    return NextResponse.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

