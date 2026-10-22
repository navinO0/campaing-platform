import { NextResponse } from "next/server";
import { getClientRemindersFromDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reminders = await getClientRemindersFromDb(id);
    return NextResponse.json({
      success: true,
      data: reminders,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

