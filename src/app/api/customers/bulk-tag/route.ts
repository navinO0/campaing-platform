import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function POST(request: Request) {
  try {
    const { customerIds, tag } = (await request.json()) as {
      customerIds: string[];
      tag: string;
    };

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0 || !tag) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Customer IDs array and tag are required" } },
        { status: 400 }
      );
    }

    const customers = db.getCustomers();
    let updatedCount = 0;

    customers.forEach((c) => {
      if (customerIds.includes(c.id)) {
        if (!c.tags.includes(tag)) {
          c.tags.push(tag);
          c.updatedAt = new Date().toISOString();
          updatedCount++;
        }
      }
    });

    db.setCustomers(customers);

    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "bulk_tag", customerIds, tag },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: { updatedCount },
      message: `Successfully tagged ${updatedCount} customers with "${tag}"`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
