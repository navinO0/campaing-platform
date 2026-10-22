import { NextResponse } from "next/server";
import { updateClientTemplateInDb, deleteClientTemplateFromDb } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    const body = await request.json();

    const updated = await updateClientTemplateInDb(templateId, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Client template not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Client template updated successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;
    const deleted = await deleteClientTemplateFromDb(templateId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Client template not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Client template deleted successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

