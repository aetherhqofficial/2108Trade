import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brokerConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const STUB_ENCRYPTION_KEY = "stub-placeholder-encryption-key";

// Stub encryption — in production, this will use AES-256-GCM with ENCRYPTION_KEY
function stubEncrypt(data: string): string {
  return `encrypted:${data}`;
}

function stubDecrypt(encrypted: string): string {
  return encrypted.replace("encrypted:", "");
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await db
    .select({
      id: brokerConnections.id,
      brokerName: brokerConnections.brokerName,
      status: brokerConnections.status,
      createdAt: brokerConnections.createdAt,
    })
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, session.user.id));

  return NextResponse.json({ brokers: connections });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { brokerName, apiKey, apiSecret } = await request.json();

    if (!brokerName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "brokerName, apiKey, and apiSecret are required" },
        { status: 400 },
      );
    }

    const credentials = JSON.stringify({ apiKey, apiSecret });
    const encrypted = stubEncrypt(credentials);

    const [connection] = await db
      .insert(brokerConnections)
      .values({
        userId: session.user.id,
        brokerName,
        encryptedApiCredentials: encrypted,
        status: "pending",
      })
      .returning({
        id: brokerConnections.id,
        brokerName: brokerConnections.brokerName,
        status: brokerConnections.status,
        createdAt: brokerConnections.createdAt,
      });

    return NextResponse.json({ broker: connection }, { status: 201 });
  } catch (error) {
    console.error("Broker connection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const brokerId = searchParams.get("id");

    if (!brokerId) {
      return NextResponse.json(
        { error: "Broker connection ID is required" },
        { status: 400 },
      );
    }

    await db
      .delete(brokerConnections)
      .where(
        and(
          eq(brokerConnections.id, brokerId),
          eq(brokerConnections.userId, session.user.id),
        ),
      );

    return NextResponse.json({ message: "Broker connection removed" });
  } catch (error) {
    console.error("Broker deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
