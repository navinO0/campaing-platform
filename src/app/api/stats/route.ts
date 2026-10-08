import { NextResponse } from "next/server";
import { getDashboardStatsFromDb } from "@/lib/db";

export async function GET() {
  try {
    const stats = await getDashboardStatsFromDb();
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (err: unknown) {
    console.error("Error fetching dashboard stats:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: (err as Error).message,
        },
      },
      { status: 500 }
    );
  }
}
