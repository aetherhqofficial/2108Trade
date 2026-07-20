import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  describe("hashPassword() + verifyPassword() round-trip", () => {
    it("should hash a password and verify it successfully", async () => {
      const password = "mySecurePassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(typeof hash).toBe("string");
      expect(hash).not.toBe(password);
      // bcrypt hashes start with $2a$ or $2b$
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject wrong password", async () => {
      const password = "correctPassword";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("wrongPassword", hash);
      expect(isValid).toBe(false);
    });

    it("should produce different hashes for the same password (unique salts)", async () => {
      const password = "samePassword";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty password", async () => {
      const hash = await hashPassword("");
      expect(hash).toBeTruthy();

      const isValid = await verifyPassword("", hash);
      expect(isValid).toBe(true);
    });

    it("should reject case-mismatched password", async () => {
      const hash = await hashPassword("CaseSensitive");
      const isValid = await verifyPassword("casesensitive", hash);
      expect(isValid).toBe(false);
    });

    it("should handle long passwords", async () => {
      const longPassword = "a".repeat(1000);
      const hash = await hashPassword(longPassword);
      const isValid = await verifyPassword(longPassword, hash);
      expect(isValid).toBe(true);
    });

    it("should handle special characters", async () => {
      const password = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });
});
