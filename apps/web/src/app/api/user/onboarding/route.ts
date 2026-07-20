import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userProfiles, paperAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  return NextResponse.json({
    onboardingCompleted: user?.onboardingCompleted ?? false,
    riskTolerance: profile?.riskTolerance ?? "moderate",
    investmentGoals: profile?.investmentGoals ?? "",
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();
  const { riskTolerance, investmentGoals } = body;

  // Update user profile
  await db
    .update(userProfiles)
    .set({
      riskTolerance: riskTolerance ?? "moderate",
      investmentGoals: investmentGoals ?? "Learn to invest",
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));

  // Mark onboarding as completed
  await db
    .update(users)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Auto-create paper account if not exists
  const [existingPaper] = await db
    .select()
    .from(paperAccounts)
    .where(eq(paperAccounts.userId, userId));

  if (!existingPaper) {
    await db.insert(paperAccounts).values({
      userId,
      balance: 10000,
      initialBalance: 10000,
      isActive: true,
    });
  }

  return NextResponse.json({
    success: true,
    onboardingCompleted: true,
  });
}
