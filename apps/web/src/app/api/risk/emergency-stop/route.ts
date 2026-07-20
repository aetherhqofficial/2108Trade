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
    .set({ emergencyStop: true, tradingPaused: true, updatedAt: new Date() })
    .where(eq(riskLimits.userId, userId));

  return NextResponse.json({
    success: true,
    message: "Emergency stop activated. All trading has been paused and open orders cancelled.",
  });
}
