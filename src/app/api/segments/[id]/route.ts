import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { CustomerSegment } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const segments = db.getSegments();
  const segment = segments.find((s) => s.id === id);

  if (!segment) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Segment not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: segment });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();

    const segments = db.getSegments();
    const index = segments.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Segment not found" } },
        { status: 404 }
      );
    }

    const updatedSegment: CustomerSegment = {
      ...segments[index],
      name: json.name || segments[index].name,
      description: json.description !== undefined ? json.description : segments[index].description,
      filter: json.filter || segments[index].filter,
      updatedAt: new Date().toISOString(),
    };

    segments[index] = updatedSegment;
    db.setSegments(segments);

    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "update_segment", segment: updatedSegment },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: updatedSegment,
      message: "Segment updated successfully",
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
  const segments = db.getSegments();
  const index = segments.findIndex((s) => s.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Segment not found" } },
      { status: 404 }
    );
  }

  const deleted = segments.splice(index, 1)[0];
  db.setSegments(segments);

  forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
    method: "POST",
    body: { action: "delete_segment", segmentId: id },
  }).catch(() => null);

  return NextResponse.json({
    success: true,
    data: deleted,
    message: "Segment deleted successfully",
  });
}
