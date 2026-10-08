import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";
import Papa from "papaparse";

export async function GET() {
  const customers = db.getCustomers();

  const csvRows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email || "",
    countryCode: c.countryCode,
    tags: c.tags.join(";"),
    segment: c.segment || "",
    optedIn: c.optedIn ? "true" : "false",
    optedOut: c.optedOut ? "true" : "false",
    optedOutAt: c.optedOutAt || "",
    optOutReason: c.optOutReason || "",
    lastContactedAt: c.lastContactedAt || "",
    createdAt: c.createdAt,
  }));

  const csv = Papa.unparse(csvRows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers_export_${Date.now()}.csv"`,
    },
  });
}
