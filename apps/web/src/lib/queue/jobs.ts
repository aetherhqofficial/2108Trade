import { getQueue, QueueNames } from "../queue";
import type { QueueName } from "../queue";

// ── Job Data Types ────────────────────────────────────────────────────────

export interface TradeExecutionJob {
  tradeId: string;
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  orderType: "market" | "limit";
  limitPrice?: number;
  brokerId: string;
  accountId: string;
  /** Idempotency key to prevent duplicate executions */
  idempotencyKey: string;
}

export interface NotificationJob {
  userId: string;
  type: "trade_executed" | "trade_failed" | "price_alert" | "ai_analysis_complete" | "system";
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface AIAnalysisJob {
  requestId: string;
  userId: string;
  symbol: string;
  strategy?: string;
  parameters?: Record<string, unknown>;
  priority?: "low" | "normal" | "high";
}

export interface DataSyncJob {
  syncId: string;
  userId: string;
  brokerId: string;
  accountId: string;
  syncType: "full" | "incremental" | "orders" | "positions" | "balances";
}

// ── Job Enqueue Helpers ────────────────────────────────────────────────────

/**
 * Enqueue a trade execution job.
 * The trade-execution worker picks this up and routes to the appropriate broker.
 */
export async function enqueueTradeExecution(
  tradeData: TradeExecutionJob,
): Promise<string> {
  const queue = getQueue(QueueNames.TRADES);
  const job = await queue.add("execute-trade", tradeData, {
    jobId: tradeData.idempotencyKey, // deduplication
    priority: 1, // highest priority
  });
  return job.id!;
}

/**
 * Enqueue a notification to be delivered to the user.
 * Handles in-app, email, and push based on user preferences.
 */
export async function enqueueNotification(
  notificationData: NotificationJob,
): Promise<string> {
  const queue = getQueue(QueueNames.NOTIFICATIONS);
  const job = await queue.add("send-notification", notificationData, {
    priority: 2,
  });
  return job.id!;
}

/**
 * Enqueue an AI analysis request.
 * The AI service worker picks this up and runs the analysis pipeline.
 */
export async function enqueueAIAnalysis(
  analysisRequest: AIAnalysisJob,
): Promise<string> {
  const queue = getQueue(QueueNames.AI_ANALYSIS);
  const priority =
    analysisRequest.priority === "high" ? 1
    : analysisRequest.priority === "low" ? 10
    : 5;
  const job = await queue.add("run-analysis", analysisRequest, { priority });
  return job.id!;
}

/**
 * Enqueue a data sync job to pull latest data from a broker.
 */
export async function enqueueDataSync(
  syncData: DataSyncJob,
): Promise<string> {
  const queue = getQueue(QueueNames.DATA_SYNC);
  const job = await queue.add("sync-data", syncData, { priority: 3 });
  return job.id!;
}

/**
 * Get the queue for a given name — direct access for advanced use cases.
 */
export function getQueueByName(name: QueueName) {
  return getQueue(name);
}
