import { Queue, Worker, type Processor, type QueueOptions } from "bullmq";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/** Queue name constants — use these instead of raw strings */
export const QueueNames = {
  TRADES: "trades",
  NOTIFICATIONS: "notifications",
  AI_ANALYSIS: "ai-analysis",
  DATA_SYNC: "data-sync",
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

const defaultQueueOptions: QueueOptions = {
  connection: { url: REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 3600 * 24 }, // keep completed jobs for 24h
    removeOnFail: { age: 3600 * 24 * 7 }, // keep failed jobs for 7 days
  },
};

/** In-memory cache of Queue instances keyed by name */
const queues = new Map<string, Queue>();

/**
 * Get or create a BullMQ Queue by name.
 * Queues are cached — calling this with the same name returns the same instance.
 */
export function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const queue = new Queue(name, defaultQueueOptions);
  queues.set(name, queue);
  return queue;
}

/**
 * Create a BullMQ Worker for the given queue.
 * Workers process jobs from the queue — one worker per queue per process.
 */
export function getWorker(
  name: QueueName,
  processor: Processor,
): Worker {
  return new Worker(name, processor, {
    connection: { url: REDIS_URL },
    concurrency: 5,
  });
}

/**
 * Gracefully shut down all queues and their workers.
 * Call this on SIGTERM/SIGINT to drain in-flight jobs.
 */
export async function shutdownQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];
  for (const queue of queues.values()) {
    closePromises.push(queue.close());
  }
  await Promise.all(closePromises);
  queues.clear();
}

/**
 * Get the Redis URL used for queue connections.
 * Useful for health checks and diagnostics.
 */
export function getRedisUrl(): string {
  return REDIS_URL;
}
