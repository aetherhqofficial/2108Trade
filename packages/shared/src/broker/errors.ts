// ── Broker Integration Framework — Error Types ──
// Standardized error handling across all broker adapters.

export type BrokerErrorCode =
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "MARKET_CLOSED"
  | "ORDER_REJECTED"
  | "INSUFFICIENT_FUNDS"
  | "UNSUPPORTED_ORDER"
  | "INVALID_SYMBOL"
  | "CONNECTION_LOST"
  | "UNKNOWN";

export class BrokerError extends Error {
  readonly code: BrokerErrorCode;
  readonly brokerName: string;
  readonly humanReadable: string;
  readonly retryable: boolean;
  readonly originalError?: unknown;

  constructor(
    code: BrokerErrorCode,
    brokerName: string,
    message: string,
    options?: { retryable?: boolean; originalError?: unknown },
  ) {
    super(message);
    this.name = "BrokerError";
    this.code = code;
    this.brokerName = brokerName;
    this.humanReadable = message;
    this.retryable = options?.retryable ?? false;
    this.originalError = options?.originalError;
  }

  /** Factory for auth failures — the most common broker integration error. */
  static authFailed(
    brokerName: string,
    message?: string,
  ): BrokerError {
    return new BrokerError(
      "AUTH_FAILED",
      brokerName,
      message ?? `${brokerName}: Authentication failed. Check your API key and secret.`,
      { retryable: false },
    );
  }

  /** Factory for rate limit errors — clients should retry after a delay. */
  static rateLimited(
    brokerName: string,
    message?: string,
  ): BrokerError {
    return new BrokerError(
      "RATE_LIMITED",
      brokerName,
      message ?? `${brokerName}: Too many requests. Please wait and try again.`,
      { retryable: true },
    );
  }

  /** Factory for connection errors. */
  static connectionLost(
    brokerName: string,
    message?: string,
  ): BrokerError {
    return new BrokerError(
      "CONNECTION_LOST",
      brokerName,
      message ?? `${brokerName}: Connection lost. Check your network and try again.`,
      { retryable: true },
    );
  }

  /** Factory for invalid symbol errors. */
  static invalidSymbol(
    brokerName: string,
    symbol: string,
  ): BrokerError {
    return new BrokerError(
      "INVALID_SYMBOL",
      brokerName,
      `${brokerName}: Symbol '${symbol}' is not recognized or not tradable.`,
      { retryable: false },
    );
  }

  /** Factory for insufficient funds. */
  static insufficientFunds(
    brokerName: string,
    message?: string,
  ): BrokerError {
    return new BrokerError(
      "INSUFFICIENT_FUNDS",
      brokerName,
      message ?? `${brokerName}: Insufficient funds to place this order.`,
      { retryable: false },
    );
  }

  /** Convert to a JSON-safe object for API responses. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      brokerName: this.brokerName,
      message: this.humanReadable,
      retryable: this.retryable,
    };
  }
}

/** Map CCXT-style errors to our standardized broker error codes. */
export function mapExchangeError(
  brokerName: string,
  error: unknown,
): BrokerError {
  const message = error instanceof Error ? error.message : String(error);

  // Rate limiting
  if (
    message.includes("rate") ||
    message.includes("Rate") ||
    message.includes("DDoS") ||
    message.includes("throttle") ||
    message.includes("too many")
  ) {
    return BrokerError.rateLimited(brokerName, message);
  }

  // Auth failures
  if (
    message.includes("auth") ||
    message.includes("Auth") ||
    message.includes("key") ||
    message.includes("Key") ||
    message.includes("signature") ||
    message.includes("Signature") ||
    message.includes("permission") ||
    message.includes("Permission")
  ) {
    return BrokerError.authFailed(brokerName, message);
  }

  // Insufficient funds
  if (
    message.includes("insufficient") ||
    message.includes("Insufficient") ||
    message.includes("balance") ||
    message.includes("Balance")
  ) {
    return BrokerError.insufficientFunds(brokerName, message);
  }

  // Invalid symbol
  if (
    message.includes("symbol") ||
    message.includes("Symbol") ||
    message.includes("market") ||
    message.includes("Market")
  ) {
    return new BrokerError("INVALID_SYMBOL", brokerName, message, {
      retryable: false,
      originalError: error,
    });
  }

  // Connection issues
  if (
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("network") ||
    message.includes("Network") ||
    message.includes("fetch") ||
    message.includes("Fetch")
  ) {
    return BrokerError.connectionLost(brokerName, message);
  }

  // Generic fallback
  return new BrokerError("UNKNOWN", brokerName, message, {
    retryable: true,
    originalError: error,
  });
}
