// ── Next.js Instrumentation ──
// Runs at server startup. Validates required environment variables.
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import so the crypto module doesn't load at build time
    const { getEncryptionKey } = await import("@/lib/encryption");

    try {
      getEncryptionKey();
      console.log("[2108trade] ENCRYPTION_KEY validated successfully.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[2108trade] ENCRYPTION_KEY validation failed: ${msg}`);
      // In production, exit so the container restarts and alerts ops.
      // In development, log but don't crash so the dev can fix it.
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    }
  }
}
