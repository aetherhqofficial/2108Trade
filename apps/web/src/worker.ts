/**
 * 2108Trade Background Worker
 *
 * Starts BullMQ workers for all queue types.
 * Each worker listens on its queue and processes jobs with stub
 * processors that log job receipt. Swap in real processors as
 * each subsystem is implemented.
 *
 * Usage: bun run worker
 * (Runs as a standalone process, typically in a Docker container.)
 */

import { getWorker, QueueNames, shutdownQueues } from "@/lib/queue";
import type { QueueName } from "@/lib/queue";

// ── Stub Processors ────────────────────────────────────────────────────────

const processors: Record<QueueName, (job: unknown) => Promise<void>> = {
  [QueueNames.TRADES]: async (job) => {
    console.log(`[worker] Trade execution job received: ${job.id}`);
    // TODO: Implement trade execution via broker integration
  },

  [QueueNames.NOTIFICATIONS]: async (job) => {
    console.log(`[worker] Notification job received: ${job.id}`);
    // TODO: Implement notification delivery (email, push, in-app)
  },

  [QueueNames.AI_ANALYSIS]: async (job) => {
    console.log(`[worker] AI analysis job received: ${job.id}`);
    // TODO: Implement AI analysis pipeline dispatch
  },

  [QueueNames.DATA_SYNC]: async (job) => {
    console.log(`[worker] Data sync job received: ${job.id}`);
    // TODO: Implement broker data synchronization
  },
};

// ── Worker Startup ─────────────────────────────────────────────────────────

function startWorkers(): void {
  const workerNames: QueueName[] = [
    QueueNames.TRADES,
    QueueNames.NOTIFICATIONS,
    QueueNames.AI_ANALYSIS,
    QueueNames.DATA_SYNC,
  ];

  for (const name of workerNames) {
    const worker = getWorker(name, async (job) => {
      await processors[name](job);
    });

    worker.on("completed", (job) => {
      console.log(`[worker] ${name}: job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[worker] ${name}: job ${job?.id} failed:`, err.message);
    });

    console.log(`[worker] Started worker for queue: ${name}`);
  }
}

// ── Graceful Shutdown ──────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log("[worker] Shutting down...");
  await shutdownQueues();
  console.log("[worker] Shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ── Main ───────────────────────────────────────────────────────────────────

console.log("[worker] 2108Trade background worker starting...");
startWorkers();
console.log("[worker] All workers started. Waiting for jobs...");
