import { NextResponse } from "next/server";
import { getCustomersFromDb, createCustomerInDb } from "@/lib/db";
import { customerSchema, normalizePhoneNumber } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Customer } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const segment = searchParams.get("segment") || undefined;
    const optIn = searchParams.get("optedIn");
    const optOut = searchParams.get("optedOut");
    const tag = searchParams.get("tag") || undefined;

    let optedIn: boolean | undefined = undefined;
    if (optIn === "true") optedIn = true;
    if (optIn === "false") optedIn = false;

    let optedOut: boolean | undefined = undefined;
    if (optOut === "true") optedOut = true;
    if (optOut === "false") optedOut = false;

    const customers = await getCustomersFromDb({
      search,
      segment: segment !== "all" ? segment : undefined,
      tag,
      optedIn,
      optedOut,
    });

    return NextResponse.json({
      success: true,
      data: customers,
      total: customers.length,
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
    const validated = customerSchema.parse(json);
    const { normalized } = normalizePhoneNumber(validated.phone);

    const newCustomerData: Customer = {
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

    const saved = await createCustomerInDb(newCustomerData);

    forwardToN8n(env.N8N_CONTACTS_WEBHOOK, {
      method: "POST",
      body: { action: "upsert", customer: saved },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: saved,
      message: "Customer created successfully in PostgreSQL database",
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
