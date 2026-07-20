// ── Coinbase Advanced Broker Adapter ──

import ccxt from "ccxt";
import { BaseCCXTAdapter } from "./base";
import type { BrokerCapabilities, BrokerCategory } from "@2108trade/shared";

export class CoinbaseAdapter extends BaseCCXTAdapter {
  readonly id = "coinbase";
  readonly name = "Coinbase";
  readonly category: BrokerCategory = "crypto";

  protected getExchangeClass(): any {
    return ccxt.coinbase;
  }

  getCapabilities(): BrokerCapabilities {
    return {
      supportsMarketOrders: true,
      supportsLimitOrders: true,
      supportsStopOrders: true,
      supportsTrailingStopOrders: false,
      supportsOptions: false,
      supportsMargin: false,
      supportsFractionalShares: false,
      supportsShortSelling: false,
      supportsPaperTrading: true,
      supportsWebSockets: true,
      supportsRealTimeStreaming: true,
      supportedTimeframes: ["1m", "5m", "15m", "1h", "1d"],
      supportedOrderTypes: ["market", "limit", "stop"],
    };
  }
}
