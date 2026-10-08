import { NextResponse } from "next/server";
import { getSegmentsFromDb, createSegmentInDb } from "@/lib/db";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { CustomerSegment } from "@/types";

export async function GET() {
  try {
    const segments = await getSegmentsFromDb();
    return NextResponse.json({
      success: true,
      data: segments,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    if (!json.name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Segment name is required" } },
        { status: 400 }
      );
    }

    const newSegment: CustomerSegment = {
      id: `seg_${Date.now()}`,
      name: json.name,
      description: json.description,
      customerCount: 0,
      filter: json.filter || { optedIn: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await createSegmentInDb(newSegment);

    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "create_segment", segment: saved },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: saved,
      message: "Customer segment created successfully in PostgreSQL",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
