import { trace, context, propagation } from "@opentelemetry/api";

/**
 * Initialize OpenTelemetry SDK for the 2108Trade web application.
 * Reads configuration from standard OTel environment variables:
 * - OTEL_EXPORTER_OTLP_ENDPOINT (default: http://localhost:4318)
 * - OTEL_SERVICE_NAME (default: 2108trade-web)
 * - OTEL_RESOURCE_ATTRIBUTES
 *
 * Call this once at application startup (e.g., in layout.tsx or instrumentation.ts).
 */
export async function initTelemetry(): Promise<void> {
  // Only initialize on the server side
  if (typeof window !== "undefined") return;

  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
  const serviceName = process.env.OTEL_SERVICE_NAME || "2108trade-web";

  try {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { Resource } = await import("@opentelemetry/resources");
    const {
      SemanticResourceAttributes,
    } = await import("@opentelemetry/semantic-conventions");

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]:
          process.env.npm_package_version || "0.1.0",
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    await sdk.start();
    console.log(`[telemetry] OpenTelemetry initialized — endpoint: ${endpoint}`);

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      await sdk.shutdown();
      console.log("[telemetry] OpenTelemetry shut down");
    });
  } catch (error) {
    console.warn(
      "[telemetry] OpenTelemetry initialization failed (non-fatal):",
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Get the current trace context for propagation to downstream services.
 */
export function getTraceContext(): Record<string, string> {
  const output: Record<string, string> = {};
  const activeContext = context.active();
  propagation.inject(activeContext, output);
  return output;
}

/**
 * Get the current active span for manual instrumentation.
 */
export { trace, context, propagation };
