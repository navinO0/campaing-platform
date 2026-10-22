import { NextResponse } from "next/server";
import { getClientByIdFromDb, updateClientInDb, deleteClientFromDb } from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientByIdFromDb(id);
    if (!client) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Client not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: client });
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
    const body = await request.json();

    let phone = body.phone;
    if (phone) {
      const { normalized, isValid } = normalizePhoneNumber(phone);
      if (isValid) phone = normalized;
    }

    const updated = await updateClientInDb(id, {
      ...body,
      phone: phone || undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Client not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Client updated successfully",
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteClientFromDb(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Client not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Client deleted successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
