// ── Kraken Broker Adapter ──

import ccxt from "ccxt";
import { BaseCCXTAdapter } from "./base";
import type { BrokerCapabilities, BrokerCategory } from "@2108trade/shared";

export class KrakenAdapter extends BaseCCXTAdapter {
  readonly id = "kraken";
  readonly name = "Kraken";
  readonly category: BrokerCategory = "crypto";

  protected getExchangeClass(): any {
    return ccxt.kraken;
  }

  /** Kraken uses XBT instead of BTC and has unusual quote symbols like XXBTZUSD. */
  protected normalizeSymbol(symbol: string): string {
    const s = symbol.toUpperCase();
    // Map common patterns to Kraken's format
    if (s === "BTC/USDT") return "XXBTZUSDT";
    if (s === "BTC/USD") return "XXBTZUSD";
    if (s === "BTC/EUR") return "XXBTZEUR";
    if (s === "ETH/USDT") return "XETHZUSDT";
    if (s === "ETH/USD") return "XETHZUSD";
    if (s === "ETH/EUR") return "XETHZEUR";
    if (s === "LTC/USDT") return "XLTCZUSDT";
    if (s === "LTC/USD") return "XLTCZUSD";
    return s;
  }

  getCapabilities(): BrokerCapabilities {
    return {
      supportsMarketOrders: true,
      supportsLimitOrders: true,
      supportsStopOrders: true,
      supportsTrailingStopOrders: false,
      supportsOptions: false,
      supportsMargin: true,
      supportsFractionalShares: false,
      supportsShortSelling: false,
      supportsPaperTrading: false,
      supportsWebSockets: true,
      supportsRealTimeStreaming: true,
      supportedTimeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"],
      supportedOrderTypes: ["market", "limit", "stop"],
    };
  }
}
