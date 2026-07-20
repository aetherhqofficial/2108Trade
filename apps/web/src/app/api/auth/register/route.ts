import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userProfiles, riskLimits, portfolios, paperAccounts } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

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

    // Create user, profile, risk limits, portfolio, and paper account
    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        onboardingCompleted: false,
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

    // Auto-create paper trading account with $10,000
    await db.insert(paperAccounts).values({
      userId: newUser.id,
      balance: 10000,
      initialBalance: 10000,
      isActive: true,
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
