import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getRateLimitConfig } from "@/lib/rate-limit";

describe("rate-limit", () => {
  // Use a unique namespace per test to avoid cross-test interference
  const testNs = `test-${Math.random().toString(36).slice(2)}`;

  describe("checkRateLimit()", () => {
    it("should allow the first request", () => {
      const result = checkRateLimit("127.0.0.1", testNs, {
        maxRequests: 5,
        windowMs: 60_000,
      });
      expect(result.allowed).toBe(true);
    });

    it("should allow requests within the limit", () => {
      const config = { maxRequests: 5, windowMs: 60_000 };
      const key = "10.0.0.1";
      const ns = testNs + "-within";

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, ns, config);
        expect(result.allowed).toBe(true);
      }
    });

    it("should block requests exceeding the limit (429 on 6th)", () => {
      const config = { maxRequests: 5, windowMs: 60_000 };
      const key = "10.0.0.2";
      const ns = testNs + "-exceed";

      // First 5 should be allowed
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, ns, config);
        expect(result.allowed).toBe(true);
      }

      // 6th should be blocked
      const blocked = checkRateLimit(key, ns, config);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter).toBeDefined();
      expect(typeof blocked.retryAfter).toBe("number");
      expect(blocked.retryAfter!).toBeGreaterThan(0);
    });

    it("should reset after window expiry", () => {
      const config = { maxRequests: 5, windowMs: 10 }; // 10ms window
      const key = "10.0.0.3";
      const ns = testNs + "-reset";

      // Use up all requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, ns, config);
      }

      // Verify blocked
      const blocked = checkRateLimit(key, ns, config);
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire — use a small wait
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const afterExpiry = checkRateLimit(key, ns, config);
          expect(afterExpiry.allowed).toBe(true);
          resolve();
        }, 15); // slightly longer than 10ms window
      });
    });

    it("should track different keys independently", () => {
      const config = { maxRequests: 2, windowMs: 60_000 };
      const ns = testNs + "-independent";

      // Use up key1's limit
      checkRateLimit("ip-1", ns, config);
      checkRateLimit("ip-1", ns, config);
      const key1Blocked = checkRateLimit("ip-1", ns, config);
      expect(key1Blocked.allowed).toBe(false);

      // key2 should still be at count 0
      const key2First = checkRateLimit("ip-2", ns, config);
      expect(key2First.allowed).toBe(true);
    });

    it("should handle multiple namespaces independently", () => {
      const config = { maxRequests: 1, windowMs: 60_000 };
      const key = "10.0.0.4";
      const ns1 = testNs + "-ns1";
      const ns2 = testNs + "-ns2";

      // Use the one allowed request in ns1
      checkRateLimit(key, ns1, config);
      const ns1Blocked = checkRateLimit(key, ns1, config);
      expect(ns1Blocked.allowed).toBe(false);

      // Same key should still be allowed in ns2
      const ns2Allowed = checkRateLimit(key, ns2, config);
      expect(ns2Allowed.allowed).toBe(true);
    });

    it("should return retryAfter as a positive number", () => {
      const config = { maxRequests: 1, windowMs: 60_000 };
      const key = "10.0.0.5";
      const ns = testNs + "-retryAfter";

      checkRateLimit(key, ns, config);
      const blocked = checkRateLimit(key, ns, config);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfter!).toBeGreaterThan(0);
      expect(blocked.retryAfter!).toBeLessThanOrEqual(60);
    });
  });

  describe("getRateLimitConfig()", () => {
    it("should return login config for /api/auth/login", () => {
      const { config, namespace } = getRateLimitConfig("/api/auth/login");
      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(60_000);
      expect(namespace).toBe("auth:login");
    });

    it("should return register config for /api/auth/register", () => {
      const { config, namespace } = getRateLimitConfig("/api/auth/register");
      expect(config.maxRequests).toBe(3);
      expect(config.windowMs).toBe(3_600_000);
      expect(namespace).toBe("auth:register");
    });

    it("should return default config for unknown paths", () => {
      const { config, namespace } = getRateLimitConfig("/api/something-else");
      expect(config.maxRequests).toBe(60);
      expect(config.windowMs).toBe(60_000);
      expect(namespace).toBe("default");
    });
  });
});
