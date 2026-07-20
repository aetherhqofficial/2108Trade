import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brokerConnections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  encryptApiCredentials,
  decryptApiCredentials,
  maskCredential,
} from "@/lib/encryption";
import {
  auditEncryptSuccess,
  auditEncryptFailure,
  auditDecryptSuccess,
  auditDecryptFailure,
  auditBrokerAccess,
} from "@/lib/audit";

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

  // Log access for audit trail (no credentials exposed)
  for (const conn of connections) {
    auditBrokerAccess(conn.brokerName, conn.id, session.user.id);
  }

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

    // Encrypt credentials with AES-256-GCM
    const credentials = JSON.stringify({ apiKey, apiSecret });
    let encrypted: string;
    try {
      encrypted = encryptApiCredentials(credentials);
    } catch (encryptError) {
      const errMsg =
        encryptError instanceof Error ? encryptError.message : "Unknown error";
      auditEncryptFailure(brokerName, session.user.id, errMsg);
      return NextResponse.json(
        { error: "Encryption error. Check that ENCRYPTION_KEY is configured." },
        { status: 500 },
      );
    }

    // Parse wrapper to extract IV, tag, and version for separate columns
    const wrapper = JSON.parse(encrypted);

    const [connection] = await db
      .insert(brokerConnections)
      .values({
        userId: session.user.id,
        brokerName,
        encryptedApiCredentials: encrypted,
        encryptionIv: wrapper.i,
        encryptionTag: wrapper.t,
        keyVersion: wrapper.v ?? 1,
        status: "pending",
      })
      .returning({
        id: brokerConnections.id,
        brokerName: brokerConnections.brokerName,
        status: brokerConnections.status,
        createdAt: brokerConnections.createdAt,
      });

    auditEncryptSuccess(brokerName, session.user.id);

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

    // Fetch the broker to get the name for audit logging
    const [broker] = await db
      .select({
        brokerName: brokerConnections.brokerName,
      })
      .from(brokerConnections)
      .where(
        and(
          eq(brokerConnections.id, brokerId),
          eq(brokerConnections.userId, session.user.id),
        ),
      );

    await db
      .delete(brokerConnections)
      .where(
        and(
          eq(brokerConnections.id, brokerId),
          eq(brokerConnections.userId, session.user.id),
        ),
      );

    // Log deletion for audit trail
    if (broker) {
      auditDecryptSuccess(broker.brokerName, session.user.id);
    }

    return NextResponse.json({ message: "Broker connection removed" });
  } catch (error) {
    console.error("Broker deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
