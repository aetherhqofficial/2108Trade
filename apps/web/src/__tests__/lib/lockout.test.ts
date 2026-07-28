import { describe, it, expect, beforeEach } from "vitest";
import {
  checkLockout,
  recordFailedAttempt,
  resetAttempts,
  _clearLockoutStore,
} from "@/lib/lockout";

describe("Account Lockout", () => {
  beforeEach(() => {
    _clearLockoutStore();
  });

  describe("checkLockout()", () => {
    it("should not be locked with no prior attempts", () => {
      const result = checkLockout("user-1");
      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(5);
    });

    it("should track remaining attempts after failures", () => {
      recordFailedAttempt("user-1");
      recordFailedAttempt("user-1");

      const result = checkLockout("user-1");
      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(3);
    });

    it("should lock after 5 failed attempts for 15 minutes", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("user-1");
      }

      const result = checkLockout("user-1");
      expect(result.locked).toBe(true);
      expect(result.lockUntil).toBeInstanceOf(Date);
      // Should be approximately 15 minutes from now
      const diff = result.lockUntil!.getTime() - Date.now();
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThanOrEqual(900_000); // 15 min in ms
    });

    it("should escalate to 1-hour lockout after 10 failed attempts", () => {
      for (let i = 0; i < 10; i++) {
        recordFailedAttempt("user-1");
      }

      const result = checkLockout("user-1");
      expect(result.locked).toBe(true);
      const diff = result.lockUntil!.getTime() - Date.now();
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThanOrEqual(3_600_000); // 1 hour
    });

    it("should reset lockout after resetAttempts", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("user-1");
      }

      expect(checkLockout("user-1").locked).toBe(true);

      resetAttempts("user-1");

      const result = checkLockout("user-1");
      expect(result.locked).toBe(false);
      expect(result.remainingAttempts).toBe(5);
    });

    it("should track different users independently", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("user-1");
      }

      expect(checkLockout("user-1").locked).toBe(true);
      expect(checkLockout("user-2").locked).toBe(false);
      expect(checkLockout("user-2").remainingAttempts).toBe(5);
    });
  });

  describe("recordFailedAttempt()", () => {
    it("should handle multiple calls gracefully", () => {
      // Should not throw
      for (let i = 0; i < 20; i++) {
        recordFailedAttempt("user-1");
      }

      const result = checkLockout("user-1");
      expect(result.locked).toBe(true);
    });
  });

  describe("resetAttempts()", () => {
    it("should be safe to call on non-existent user", () => {
      expect(() => resetAttempts("nonexistent")).not.toThrow();
    });
  });
});
