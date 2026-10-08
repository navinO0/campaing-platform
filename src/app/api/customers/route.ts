import { NextResponse } from "next/server";
import { initialCustomers } from "@/lib/data/store";
import { customerSchema, normalizePhoneNumber } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Customer } from "@/types";

let customersList = [...initialCustomers];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase();
  const segment = searchParams.get("segment");
  const optIn = searchParams.get("optedIn");
  const optOut = searchParams.get("optedOut");

  let filtered = [...customersList];

  if (search) {
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        (c.email && c.email.toLowerCase().includes(search)) ||
        c.tags.some((t) => t.toLowerCase().includes(search))
    );
  }

  if (segment && segment !== "all") {
    filtered = filtered.filter((c) => c.segment === segment);
  }

  if (optIn === "true") {
    filtered = filtered.filter((c) => c.optedIn && !c.optedOut);
  }

  if (optOut === "true") {
    filtered = filtered.filter((c) => c.optedOut);
  }

  return NextResponse.json({
    success: true,
    data: filtered,
    total: filtered.length,
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const validated = customerSchema.parse(json);

    const { normalized } = normalizePhoneNumber(validated.phone);

    // Duplicate check
    const existingIndex = customersList.findIndex((c) => c.phone === normalized);
    if (existingIndex !== -1) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE_PHONE", message: "Customer with this phone already exists" },
        },
        { status: 409 }
      );
    }

    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: validated.name,
      phone: normalized,
      email: validated.email || undefined,
      countryCode: validated.countryCode || "91",
      tags: validated.tags || [],
      segment: validated.segment || "All Customers",
      source: "Manual Admin Entry",
      optedIn: validated.optedIn ?? true,
      optedOut: validated.optedOut ?? false,
      optedOutAt: validated.optedOut ? new Date().toISOString() : null,
      optOutReason: validated.optOutReason || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Forward to n8n contacts webhook
    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "upsert", customer: newCustomer },
    }).catch(() => null);

    customersList = [newCustomer, ...customersList];

    return NextResponse.json({
      success: true,
      data: newCustomer,
      message: "Customer created successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: (err as Error).message },
      },
      { status: 400 }
    );
  }
}
