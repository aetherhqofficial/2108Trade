import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { paperAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Check if user already has a paper account
  const [existing] = await db
    .select()
    .from(paperAccounts)
    .where(eq(paperAccounts.userId, userId));

  if (existing) {
    return NextResponse.json({
      paperAccount: {
        id: existing.id,
        balance: existing.balance,
        initialBalance: existing.initialBalance,
        isActive: existing.isActive,
      },
    });
  }

  const [paperAccount] = await db
    .insert(paperAccounts)
    .values({
      userId,
      balance: 10000,
      initialBalance: 10000,
      isActive: true,
    })
    .returning();

  return NextResponse.json(
    {
      paperAccount: {
        id: paperAccount.id,
        balance: paperAccount.balance,
        initialBalance: paperAccount.initialBalance,
        isActive: paperAccount.isActive,
      },
    },
    { status: 201 },
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [paperAccount] = await db
    .select()
    .from(paperAccounts)
    .where(eq(paperAccounts.userId, userId));

  if (!paperAccount) {
    return NextResponse.json({ paperAccount: null });
  }

  return NextResponse.json({
    paperAccount: {
      id: paperAccount.id,
      balance: paperAccount.balance,
      initialBalance: paperAccount.initialBalance,
      isActive: paperAccount.isActive,
      createdAt: paperAccount.createdAt,
    },
  });
}
