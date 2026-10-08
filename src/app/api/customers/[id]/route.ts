import { NextResponse } from "next/server";
import { getCustomerByIdFromDb, updateCustomerInDb, deleteCustomerFromDb } from "@/lib/db";
import { customerSchema, normalizePhoneNumber } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await getCustomerByIdFromDb(id);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
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
    const validated = customerSchema.parse(json);
    const { normalized } = normalizePhoneNumber(validated.phone);

    const updatedCustomer = await updateCustomerInDb(id, {
      name: validated.name,
      phone: normalized,
      email: validated.email || undefined,
      countryCode: validated.countryCode || "91",
      tags: validated.tags || [],
      segment: validated.segment,
      optedIn: validated.optedIn ?? true,
      optedOut: validated.optedOut ?? false,
      optedOutAt: validated.optedOut ? new Date().toISOString() : null,
      optOutReason: validated.optOutReason || null,
    });

    if (!updatedCustomer) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    // Notify n8n contacts webhook
    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "update", customer: updatedCustomer },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      message: "Customer updated successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_OR_DB_ERROR", message: (err as Error).message } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteCustomerFromDb(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "delete", customerId: id },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
