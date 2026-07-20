import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userProfiles, riskLimits, portfolios } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user, profile, risk limits, and portfolio in a transaction
    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
      })
      .returning();

    // Create default profile
    await db.insert(userProfiles).values({
      userId: newUser.id,
    });

    // Create default risk limits
    await db.insert(riskLimits).values({
      userId: newUser.id,
    });

    // Create default portfolio
    await db.insert(portfolios).values({
      userId: newUser.id,
      totalValue: 0,
      cashBalance: 0,
    });

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
        },
        message: "Registration successful. Please sign in.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
