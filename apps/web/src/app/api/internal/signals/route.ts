import { NextResponse } from "next/server";

/**
 * POST /api/internal/signals
 *
 * Receives trade signals from the quant service.
 * This is a stub — the quant service will POST structured signal data here.
 * The AI service reads these signals to enrich with market context.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate basic structure
    if (!body.signals || !Array.isArray(body.signals)) {
      return NextResponse.json(
        { error: "Expected { signals: [...] }" },
        { status: 400 },
      );
    }

    // Stub: log and acknowledge
    console.log(`[internal/signals] Received ${body.signals.length} signals`);

    // In production, signals are stored in Redis Pub/Sub and persisted to DB
    // for the AI service to consume. For now, just acknowledge.

    return NextResponse.json({
      received: body.signals.length,
      status: "acknowledged",
      message: "Signals received. Full pipeline integration pending.",
    });
  } catch (error) {
    console.error("[internal/signals] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
