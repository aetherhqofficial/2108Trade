import { describe, it, expect } from "vitest";
import {
  generateCSRFToken,
  validateCSRFToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "@/lib/csrf";

describe("CSRF", () => {
  describe("generateCSRFToken()", () => {
    it("should generate a 64-character hex string", () => {
      const token = generateCSRFToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it("should generate unique tokens", () => {
      const t1 = generateCSRFToken();
      const t2 = generateCSRFToken();
      expect(t1).not.toBe(t2);
    });
  });

  describe("validateCSRFToken()", () => {
    it("should return true for matching tokens", () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it("should return false for mismatched tokens", () => {
      expect(validateCSRFToken("abc", "def")).toBe(false);
    });

    it("should return false when cookie token is undefined", () => {
      expect(validateCSRFToken(undefined, "some-token")).toBe(false);
    });

    it("should return false when header token is null", () => {
      expect(validateCSRFToken("some-token", null)).toBe(false);
    });

    it("should return false when both are missing", () => {
      expect(validateCSRFToken(undefined, null)).toBe(false);
    });
  });

  describe("constants", () => {
    it("should export CSRF_COOKIE_NAME", () => {
      expect(CSRF_COOKIE_NAME).toBe("csrf-token");
    });

    it("should export CSRF_HEADER_NAME", () => {
      expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
    });
  });
});
