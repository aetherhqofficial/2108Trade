// ── Binance Broker Adapter ──

import ccxt from "ccxt";
import { BaseCCXTAdapter } from "./base";
import type { BrokerCapabilities, BrokerCategory } from "@2108trade/shared";

export class BinanceAdapter extends BaseCCXTAdapter {
  readonly id = "binance";
  readonly name = "Binance";
  readonly category: BrokerCategory = "crypto";

  protected getExchangeClass(): any {
    return ccxt.binance;
  }

  getCapabilities(): BrokerCapabilities {
    return {
      supportsMarketOrders: true,
      supportsLimitOrders: true,
      supportsStopOrders: true,
      supportsTrailingStopOrders: true,
      supportsOptions: false,
      supportsMargin: true,
      supportsFractionalShares: false,
      supportsShortSelling: false,
      supportsPaperTrading: true,
      supportsWebSockets: true,
      supportsRealTimeStreaming: true,
      supportedTimeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
      supportedOrderTypes: ["market", "limit", "stop", "stop_limit", "trailing_stop"],
    };
  }
}
