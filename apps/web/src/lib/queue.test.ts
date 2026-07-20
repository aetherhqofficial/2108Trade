import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueueNames, getQueue, getWorker, shutdownQueues } from "@/lib/queue";

// Mock BullMQ so we don't need a real Redis connection in tests
vi.mock("bullmq", () => {
  const mockQueue = {
    close: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
  };
  const mockWorker = {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    Queue: vi.fn().mockImplementation(() => mockQueue),
    Worker: vi.fn().mockImplementation(() => mockWorker),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("queue module", () => {
  describe("QueueNames", () => {
    it("should define all four queue names", () => {
      expect(QueueNames.TRADES).toBe("trades");
      expect(QueueNames.NOTIFICATIONS).toBe("notifications");
      expect(QueueNames.AI_ANALYSIS).toBe("ai-analysis");
      expect(QueueNames.DATA_SYNC).toBe("data-sync");
    });

    it("should have unique values", () => {
      const values = Object.values(QueueNames);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  });

  describe("getQueue", () => {
    it("should return a Queue instance", () => {
      const queue = getQueue(QueueNames.TRADES);
      expect(queue).toBeDefined();
      expect(queue.add).toBeDefined();
    });

    it("should return the same instance for the same name (caching)", () => {
      const q1 = getQueue(QueueNames.NOTIFICATIONS);
      const q2 = getQueue(QueueNames.NOTIFICATIONS);
      expect(q1).toBe(q2);
    });

    it("should return different instances for different names", () => {
      const q1 = getQueue(QueueNames.TRADES);
      const q2 = getQueue(QueueNames.AI_ANALYSIS);
      expect(q1).not.toBe(q2);
    });
  });

  describe("getWorker", () => {
    it("should return a Worker instance", () => {
      const processor = vi.fn();
      const worker = getWorker(QueueNames.DATA_SYNC, processor);
      expect(worker).toBeDefined();
      expect(worker.on).toBeDefined();
    });
  });

  describe("shutdownQueues", () => {
    it("should close all queues", async () => {
      // Create some queues first
      getQueue(QueueNames.TRADES);
      getQueue(QueueNames.NOTIFICATIONS);

      await shutdownQueues();

      // After shutdown, creating a queue should return a new instance
      const fresh = getQueue(QueueNames.TRADES);
      expect(fresh).toBeDefined();
    });
  });
});
