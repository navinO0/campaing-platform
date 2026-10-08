import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export async function GET() {
  const timestamp = new Date().toISOString();
  const response: ApiResponse<{
    status: string;
    service: string;
    timestamp: string;
    uptime: number;
  }> = {
    success: true,
    data: {
      status: "ok",
      service: "whatsapp-campaign-dashboard",
      timestamp,
      uptime: process.uptime(),
    },
  };
  return NextResponse.json(response);
}
