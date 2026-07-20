import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trades } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10),
    ),
  );

  const offset = (page - 1) * pageSize;

  const [tradeList, [totalCount]] = await Promise.all([
    db
      .select()
      .from(trades)
      .where(eq(trades.userId, session.user.id))
      .orderBy(desc(trades.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(trades)
      .where(eq(trades.userId, session.user.id)),
  ]);

  return NextResponse.json({
    trades: tradeList,
    pagination: {
      page,
      pageSize,
      total: totalCount.value,
      totalPages: Math.ceil(totalCount.value / pageSize),
    },
  });
}
