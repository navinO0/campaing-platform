import { NextResponse } from "next/server";
import { bulkOptOutCustomersInDb } from "@/lib/db";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function POST(request: Request) {
  try {
    const { customerIds, reason } = (await request.json()) as {
      customerIds: string[];
      reason?: string;
    };

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Customer IDs array is required" } },
        { status: 400 }
      );
    }

    const optedOutCount = await bulkOptOutCustomersInDb(
      customerIds,
      reason || "Bulk Admin Suppression"
    );

    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "bulk_opt_out", customerIds, reason },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: { optedOutCount },
      message: `Successfully suppressed ${optedOutCount} customers to the opt-out blocklist`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
