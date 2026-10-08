import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";
import { customerSchema, normalizePhoneNumber } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Customer } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customers = db.getCustomers();
  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: customer });
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

    const customers = db.getCustomers();
    const index = customers.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    // Check duplicate phone if changed
    const duplicate = customers.find((c) => c.phone === normalized && c.id !== id);
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_PHONE", message: "Another customer has this phone" } },
        { status: 409 }
      );
    }

    const updatedCustomer: Customer = {
      ...customers[index],
      name: validated.name,
      phone: normalized,
      email: validated.email || undefined,
      countryCode: validated.countryCode || "91",
      tags: validated.tags || [],
      segment: validated.segment || customers[index].segment,
      optedIn: validated.optedIn ?? true,
      optedOut: validated.optedOut ?? false,
      optedOutAt: validated.optedOut
        ? customers[index].optedOutAt || new Date().toISOString()
        : null,
      optOutReason: validated.optOutReason || null,
      updatedAt: new Date().toISOString(),
    };

    customers[index] = updatedCustomer;
    db.setCustomers(customers);

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
      { success: false, error: { code: "VALIDATION_ERROR", message: (err as Error).message } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customers = db.getCustomers();
  const index = customers.findIndex((c) => c.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } },
      { status: 404 }
    );
  }

  const deleted = customers.splice(index, 1)[0];
  db.setCustomers(customers);

  forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
    method: "POST",
    body: { action: "delete", customerId: id },
  }).catch(() => null);

  return NextResponse.json({
    success: true,
    data: deleted,
    message: "Customer deleted successfully",
  });
}
