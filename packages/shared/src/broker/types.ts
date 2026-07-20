// ── Broker Integration Framework — Core Types ──
// Every broker adapter implements these interfaces.
// Platform code never imports broker-specific logic directly.

// ── Credentials & Auth ──

export interface BrokerCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string; // e.g. Coinbase requires a passphrase
  subaccount?: string; // e.g. FTX-style subaccounts
}

export interface AuthResult {
  success: boolean;
  message: string;
  permissions?: string[];
  accountId?: string;
}

// ── Account ──

export interface AccountInfo {
  id: string;
  name: string;
  email?: string;
  brokerName: string;
  canTrade: boolean;
  canWithdraw: boolean;
  accountType: "live" | "paper" | "sandbox";
  currency: string;
}

// ── Portfolio ──

export interface PortfolioData {
  totalValue: number;
  availableBalance: number;
  currency: string;
  timestamp: number; // unix ms
  dailyPnl?: number;
  dailyPnlPct?: number;
}

export interface Position {
  symbol: string;
  side: "long" | "short";
  quantity: number;
  avgEntryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  liquidationPrice?: number;
  leverage?: number;
}

export interface Balance {
  asset: string;
  free: number;
  used: number;
  total: number;
}

// ── Market Data ──

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  timestamp: number; // unix ms
  change24h?: number;
  change24hPct?: number;
  volume24h?: number;
}

export interface Candle {
  timestamp: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Orders ──

export type OrderType = "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
export type OrderSide = "buy" | "sell";

export interface OrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // required for limit, stop_limit
  stopPrice?: number; // required for stop, stop_limit, trailing_stop
  reduceOnly?: boolean;
  timeInForce?: "GTC" | "IOC" | "FOK" | "PO";
  clientOrderId?: string;
}

export interface OrderResult {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  quantity: number;
  filledQuantity: number;
  price?: number;
  avgFillPrice?: number;
  timestamp: number; // unix ms
  remainingQuantity?: number;
}

export type OrderStatus = "open" | "filled" | "partially_filled" | "canceled" | "expired" | "rejected";

export interface Order {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  quantity: number;
  filledQuantity: number;
  price?: number;
  avgFillPrice?: number;
  timestamp: number;
  updatedAt?: number;
}

// ── Trade History ──

export interface TradeHistoryParams {
  symbol?: string;
  since?: number; // unix ms
  limit?: number;
  orderId?: string;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  fee?: { cost: number; currency: string };
  timestamp: number; // unix ms
}

// ── Capabilities ──

export type BrokerTimeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" | "1M";

export interface BrokerCapabilities {
  supportsMarketOrders: boolean;
  supportsLimitOrders: boolean;
  supportsStopOrders: boolean;
  supportsTrailingStopOrders: boolean;
  supportsOptions: boolean;
  supportsMargin: boolean;
  supportsFractionalShares: boolean;
  supportsShortSelling: boolean;
  supportsPaperTrading: boolean;
  supportsWebSockets: boolean;
  supportsRealTimeStreaming: boolean;
  supportedTimeframes: BrokerTimeframe[];
  supportedOrderTypes: OrderType[];
}

// ── Broker Adapter Interface ──

export interface BrokerAdapter {
  readonly id: string;
  readonly name: string;
  readonly category: BrokerCategory;

  // Auth
  authenticate(credentials: BrokerCredentials): Promise<AuthResult>;
  validateSession(): Promise<boolean>;

  // Account
  getAccount(): Promise<AccountInfo>;

  // Portfolio
  getPortfolio(): Promise<PortfolioData>;
  getPositions(): Promise<Position[]>;
  getBalances(): Promise<Balance[]>;

  // Market Data
  getQuote(symbol: string): Promise<Quote>;
  getHistoricalData(
    symbol: string,
    timeframe: BrokerTimeframe,
    limit: number,
  ): Promise<Candle[]>;

  // Orders
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  cancelOrder(orderId: string): Promise<void>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
  getOpenOrders(): Promise<Order[]>;

  // Trade History
  getTradeHistory(params: TradeHistoryParams): Promise<Trade[]>;

  // Capabilities
  getCapabilities(): BrokerCapabilities;

  // Lifecycle
  disconnect(): Promise<void>;
}

// ── Broker Category (re-exported from index) ──

export type BrokerCategory = "crypto" | "stocks" | "forex";
