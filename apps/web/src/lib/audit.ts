// ── Audit Logging Utility ──
// Structured JSON logging for security-sensitive operations.
// Logs to stdout in JSON format for ingestion by log aggregators.
//
// NEVER log credentials, keys, or plaintext secrets.

// ── Types ────────────────────────────────────────────────────────────────

export type AuditOperation =
  | "broker.credentials.encrypt"
  | "broker.credentials.decrypt"
  | "broker.credentials.access"
  | "broker.connection.create"
  | "broker.connection.delete"
  | "broker.connection.read";

export interface AuditEntry {
  timestamp: string;
  operation: AuditOperation;
  brokerName?: string;
  brokerId?: string;
  userId?: string;
  outcome: "success" | "failure";
  error?: string;
  /** Additional context, stripped of any sensitive values. */
  context?: Record<string, unknown>;
}

// ── Logger ────────────────────────────────────────────────────────────────

/**
 * Emits a structured audit log entry to stdout as JSON.
 * Safe to call in any environment — failures are caught silently
 * so logging never breaks the application.
 */
export function auditLog(entry: AuditEntry): void {
  try {
    const logLine = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
      service: "2108trade-web",
      log_type: "audit",
    });
    // stdout so container orchestrators capture it
    process.stdout.write(logLine + "\n");
  } catch {
    // Audit logging must never throw — it's a non-critical side channel.
  }
}

// ── Convenience Helpers ──────────────────────────────────────────────────

export function auditEncryptSuccess(brokerName: string, userId: string): void {
  auditLog({
    timestamp: new Date().toISOString(),
    operation: "broker.credentials.encrypt",
    brokerName,
    userId,
    outcome: "success",
  });
}

export function auditEncryptFailure(
  brokerName: string,
  userId: string,
  error: string,
): void {
  auditLog({
    timestamp: new Date().toISOString(),
    operation: "broker.credentials.encrypt",
    brokerName,
    userId,
    outcome: "failure",
    error,
  });
}

export function auditDecryptSuccess(brokerName: string, userId: string): void {
  auditLog({
    timestamp: new Date().toISOString(),
    operation: "broker.credentials.decrypt",
    brokerName,
    userId,
    outcome: "success",
  });
}

export function auditDecryptFailure(
  brokerName: string,
  userId: string,
  error: string,
): void {
  auditLog({
    timestamp: new Date().toISOString(),
    operation: "broker.credentials.decrypt",
    brokerName,
    userId,
    outcome: "failure",
    error,
  });
}

export function auditBrokerAccess(
  brokerName: string,
  brokerId: string,
  userId: string,
): void {
  auditLog({
    timestamp: new Date().toISOString(),
    operation: "broker.credentials.access",
    brokerName,
    brokerId,
    userId,
    outcome: "success",
  });
}
