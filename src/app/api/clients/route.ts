import { NextResponse } from "next/server";
import { getClientsWithTemplatesFromDb, createClientInDb } from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/validation";

export async function GET() {
  try {
    const clients = await getClientsWithTemplatesFromDb();
    return NextResponse.json({
      success: true,
      data: clients,
      count: clients.length,
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
    const body = await request.json();

    if (!body.name || !body.phone) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and Mobile Phone Number are required" } },
        { status: 400 }
      );
    }

    const { normalized, isValid } = normalizePhoneNumber(body.phone);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PHONE", message: "Please provide a valid mobile number with country code" } },
        { status: 400 }
      );
    }

    const newClient = await createClientInDb({
      name: body.name.trim(),
      phone: normalized,
      company: body.company?.trim() || null,
      serviceType: body.serviceType?.trim() || "General Service Maintenance",
      chargesAmount: Number(body.chargesAmount) || 0,
      dueDate: body.dueDate || null,
      notes: body.notes?.trim() || null,
      status: body.status || "active",
    });

    return NextResponse.json({
      success: true,
      data: newClient,
      message: "Client created successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
