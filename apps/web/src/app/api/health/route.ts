import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    version: "0.1.0",
    uptime: process.uptime(),
  });
}
