// ── Base Broker Adapter ──
// Shared logic for all CCXT-based crypto exchange adapters.
// Every adapter extends this and fills in exchange-specific details.

import type {
  BrokerAdapter,
  BrokerCredentials,
  AuthResult,
  AccountInfo,
  PortfolioData,
  Position,
  Balance,
  Quote,
  Candle,
  OrderRequest,
  OrderResult,
  OrderStatus,
  Order,
  TradeHistoryParams,
  Trade,
  BrokerCapabilities,
  BrokerCategory,
  BrokerTimeframe,
} from "@2108trade/shared";
import { BrokerError, mapExchangeError } from "@2108trade/shared";

// Map our timeframes to CCXT timeframes
const TIMEFRAME_MAP: Record<BrokerTimeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "1w": "1w",
  "1M": "1M",
};

export abstract class BaseCCXTAdapter implements BrokerAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly category: BrokerCategory;

  protected exchange: any = null;
  protected authenticated = false;
  protected credentials: BrokerCredentials | null = null;

  /** Subclasses supply the CCXT exchange class (e.g. ccxt.binance). */
  protected abstract getExchangeClass(): any;

  /** Subclasses supply capabilities for their exchange. */
  abstract getCapabilities(): BrokerCapabilities;

  /** Subclasses can override for exchange-specific symbol formatting. */
  protected normalizeSymbol(symbol: string): string {
    return symbol.toUpperCase();
  }

  async authenticate(credentials: BrokerCredentials): Promise<AuthResult> {
    this.credentials = credentials;
    try {
      const ExchangeClass = this.getExchangeClass();
      this.exchange = new ExchangeClass({
        apiKey: credentials.apiKey,
        secret: credentials.apiSecret,
        password: credentials.passphrase,
        enableRateLimit: true,
      });

      // Validate by fetching balance (lightest authenticated call)
      await this.exchange.fetchBalance();
      this.authenticated = true;

      return {
        success: true,
        message: `Connected to ${this.name}`,
        permissions: ["read", "trade"],
      };
    } catch (error) {
      this.authenticated = false;
      throw mapExchangeError(this.name, error);
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this.exchange || !this.authenticated) return false;
    try {
      await this.exchange.fetchBalance();
      return true;
    } catch {
      this.authenticated = false;
      return false;
    }
  }

  async getAccount(): Promise<AccountInfo> {
    this.ensureAuthenticated();
    return {
      id: this.id,
      name: this.name,
      brokerName: this.name,
      canTrade: true,
      canWithdraw: false, // 2108Trade never requests withdrawal access
      accountType: "live",
      currency: "USD",
    };
  }

  async getPortfolio(): Promise<PortfolioData> {
    this.ensureAuthenticated();
    try {
      const balance = await this.exchange.fetchBalance();
      const total = balance.total ?? {};
      // Sum all non-zero balances in USD-equivalent terms
      // CCXT returns "free" and "used" per asset
      const totalValue =
        typeof total["USDT"] === "number"
          ? total["USDT"]
          : typeof total["USD"] === "number"
            ? total["USD"]
            : 0;

      return {
        totalValue,
        availableBalance: totalValue,
        currency: "USD",
        timestamp: Date.now(),
      };
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async getPositions(): Promise<Position[]> {
    this.ensureAuthenticated();
    try {
      // CCXT's fetchPositions works for derivatives; for spot, derive from non-zero balances
      let positions: Position[] = [];

      if (typeof this.exchange.fetchPositions === "function") {
        try {
          const raw = await this.exchange.fetchPositions();
          positions = (raw ?? [])
            .filter((p: any) => p.contracts && p.contracts > 0)
            .map((p: any) => ({
              symbol: p.symbol,
              side: p.side === "short" ? "short" : "long",
              quantity: Math.abs(p.contracts),
              avgEntryPrice: p.entryPrice ?? 0,
              markPrice: p.markPrice ?? 0,
              unrealizedPnl: p.unrealizedPnl ?? 0,
              unrealizedPnlPct: p.percentage ?? 0,
              liquidationPrice: p.liquidationPrice,
              leverage: p.leverage,
            }));
        } catch {
          // Exchange doesn't support positions — fall through to balances
        }
      }

      return positions;
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async getBalances(): Promise<Balance[]> {
    this.ensureAuthenticated();
    try {
      const balance = await this.exchange.fetchBalance();
      const result: Balance[] = [];
      const free = balance.free ?? {};
      const used = balance.used ?? {};
      const total = balance.total ?? {};

      for (const asset of Object.keys(total)) {
        const t = total[asset];
        if (typeof t === "number" && t > 0) {
          result.push({
            asset,
            free: (free[asset] as number) ?? 0,
            used: (used[asset] as number) ?? 0,
            total: t,
          });
        }
      }
      return result;
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    this.ensureAuthenticated();
    try {
      const ticker = await this.exchange.fetchTicker(
        this.normalizeSymbol(symbol),
      );
      return {
        symbol: this.normalizeSymbol(symbol),
        bid: ticker.bid ?? 0,
        ask: ticker.ask ?? 0,
        last: ticker.last ?? 0,
        timestamp: ticker.timestamp ?? Date.now(),
        change24h: ticker.change,
        change24hPct: ticker.percentage,
        volume24h: ticker.baseVolume,
      };
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async getHistoricalData(
    symbol: string,
    timeframe: BrokerTimeframe,
    limit: number,
  ): Promise<Candle[]> {
    this.ensureAuthenticated();
    try {
      const ccxtTF = TIMEFRAME_MAP[timeframe] ?? "1d";
      const raw = await this.exchange.fetchOHLCV(
        this.normalizeSymbol(symbol),
        ccxtTF,
        undefined,
        limit,
      );

      return (raw ?? []).map((c: number[]) => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
      }));
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    this.ensureAuthenticated();
    try {
      const ccxtOrder = await this.exchange.createOrder(
        this.normalizeSymbol(order.symbol),
        order.type,
        order.side,
        order.quantity,
        order.price,
        {
          stopPrice: order.stopPrice,
          reduceOnly: order.reduceOnly,
          timeInForce: order.timeInForce,
          clientOrderId: order.clientOrderId,
        },
      );

      return {
        orderId: ccxtOrder.id,
        clientOrderId: ccxtOrder.clientOrderId,
        symbol: ccxtOrder.symbol,
        side: ccxtOrder.side as any,
        type: ccxtOrder.type as any,
        status: ccxtOrder.status as OrderStatus,
        quantity: ccxtOrder.amount,
        filledQuantity: ccxtOrder.filled,
        price: ccxtOrder.price,
        avgFillPrice: ccxtOrder.average,
        timestamp: ccxtOrder.timestamp ?? Date.now(),
        remainingQuantity: ccxtOrder.remaining,
      };
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    this.ensureAuthenticated();
    try {
      await this.exchange.cancelOrder(orderId);
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    this.ensureAuthenticated();
    try {
      const order = await this.exchange.fetchOrder(orderId);
      return order.status as OrderStatus;
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async getOpenOrders(): Promise<Order[]> {
    this.ensureAuthenticated();
    try {
      const orders = await this.exchange.fetchOpenOrders();
      return (orders ?? []).map((o: any) => ({
        orderId: o.id,
        clientOrderId: o.clientOrderId,
        symbol: o.symbol,
        side: o.side as any,
        type: o.type as any,
        status: o.status as OrderStatus,
        quantity: o.amount,
        filledQuantity: o.filled,
        price: o.price,
        avgFillPrice: o.average,
        timestamp: o.timestamp ?? Date.now(),
        updatedAt: o.lastTradeTimestamp,
      }));
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async getTradeHistory(params: TradeHistoryParams): Promise<Trade[]> {
    this.ensureAuthenticated();
    try {
      const trades = await this.exchange.fetchMyTrades(
        params.symbol ? this.normalizeSymbol(params.symbol) : undefined,
        params.since,
        params.limit ?? 50,
      );

      return (trades ?? []).map((t: any) => ({
        id: t.id,
        orderId: t.order,
        symbol: t.symbol,
        side: t.side as any,
        quantity: t.amount,
        price: t.price,
        fee: t.fee
          ? { cost: t.fee.cost, currency: t.fee.currency }
          : undefined,
        timestamp: t.timestamp ?? Date.now(),
      }));
    } catch (error) {
      throw mapExchangeError(this.name, error);
    }
  }

  async disconnect(): Promise<void> {
    this.authenticated = false;
    this.credentials = null;
    this.exchange = null;
  }

  /** Throw if session isn't authenticated. */
  protected ensureAuthenticated(): void {
    if (!this.authenticated || !this.exchange) {
      throw BrokerError.authFailed(
        this.name,
        `${this.name}: Not authenticated. Call authenticate() first.`,
      );
    }
  }
}
