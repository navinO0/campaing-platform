import { NextResponse } from "next/server";
import { getSegmentByIdFromDb, updateSegmentInDb, deleteSegmentFromDb } from "@/lib/db";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const segment = await getSegmentByIdFromDb(id);

    if (!segment) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Segment not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: segment });
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

    const updated = await updateSegmentInDb(id, {
      name: json.name,
      description: json.description,
      filter: json.filter,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Segment not found" } },
        { status: 404 }
      );
    }

    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "update_segment", segment: updated },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Segment updated successfully in PostgreSQL",
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
    const deleted = await deleteSegmentFromDb(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Segment not found" } },
        { status: 404 }
      );
    }

    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "delete_segment", segmentId: id },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Segment deleted successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
