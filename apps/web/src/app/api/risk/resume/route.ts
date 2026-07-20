import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { riskLimits } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  await db
    .update(riskLimits)
    .set({ emergencyStop: false, tradingPaused: false, updatedAt: new Date() })
    .where(eq(riskLimits.userId, userId));

  return NextResponse.json({
    success: true,
    message: "Trading has been resumed. Emergency stop is no longer active.",
  });
}
