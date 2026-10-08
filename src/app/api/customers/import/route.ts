import { NextResponse } from "next/server";
import { normalizePhoneNumber } from "@/lib/validation";
import { createCustomerInDb } from "@/lib/db";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Customer } from "@/types";

interface ImportRow {
  name: string;
  phone: string;
  email?: string;
  countryCode?: string;
  tags?: string;
  optedIn?: string | boolean;
  segment?: string;
}

export async function POST(request: Request) {
  try {
    const { rows } = (await request.json()) as { rows: ImportRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No rows provided for import" } },
        { status: 400 }
      );
    }

    const validCustomers: Customer[] = [];
    const invalidRows: Array<{ row: ImportRow; reason: string }> = [];
    const duplicates: ImportRow[] = [];
    const optedOutSuppressed: ImportRow[] = [];
    const seenPhones = new Set<string>();

    for (const r of rows) {
      if (!r.name || !r.phone) {
        invalidRows.push({ row: r, reason: "Missing required name or phone" });
        continue;
      }

      // Explicit Opt-Out check: Do not import customers who are opted-out
      const isOptedOut = r.optedIn === false || r.optedIn === "false" || r.optedIn === "0";

      if (isOptedOut) {
        optedOutSuppressed.push(r);
        continue;
      }

      const { isValid, normalized, error } = normalizePhoneNumber(r.phone, r.countryCode || "91");
      if (!isValid) {
        invalidRows.push({ row: r, reason: error || "Invalid phone number format" });
        continue;
      }

      if (seenPhones.has(normalized)) {
        duplicates.push(r);
        continue;
      }
      seenPhones.add(normalized);

      const tagsArray = typeof r.tags === "string" ? r.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      const customerRecord: Customer = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: r.name.trim(),
        phone: normalized,
        email: r.email?.trim() || undefined,
        countryCode: r.countryCode || "91",
        tags: tagsArray,
        segment: r.segment?.trim() || "All Customers",
        source: "CSV Import Wizard",
        optedIn: true,
        optedOut: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const saved = await createCustomerInDb(customerRecord);
        validCustomers.push(saved);
      } catch (saveErr) {
        console.error("Failed to save imported customer:", saveErr);
        invalidRows.push({ row: r, reason: (saveErr as Error).message });
      }
    }

    // Forward batch to n8n Customer Import Webhook
    forwardToN8n(env.N8N_CUSTOMER_IMPORT_WEBHOOK, {
      method: "POST",
      body: {
        customers: validCustomers,
        totalImported: validCustomers.length,
        timestamp: Date.now(),
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: {
        totalRows: rows.length,
        validCount: validCustomers.length,
        invalidCount: invalidRows.length,
        duplicatesCount: duplicates.length,
        suppressedOptOutCount: optedOutSuppressed.length,
        invalidRows,
      },
      message: `Successfully processed and persisted ${validCustomers.length} valid customer records to PostgreSQL.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}
