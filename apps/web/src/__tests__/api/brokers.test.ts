import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted to avoid ReferenceError) ─────────────────────────────

const {
  mockDbSelect,
  mockDbInsert,
  mockAuth,
  mockEncryptApiCredentials,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockAuth: vi.fn(),
  mockEncryptApiCredentials: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/encryption", () => ({
  encryptApiCredentials: mockEncryptApiCredentials,
  decryptApiCredentials: vi.fn(),
  maskCredential: vi.fn((val: string) => "****" + val.slice(-4)),
  getEncryptionKey: vi.fn(() => Buffer.alloc(32)),
}));

vi.mock("@/lib/audit", () => ({
  auditEncryptSuccess: vi.fn(),
  auditEncryptFailure: vi.fn(),
  auditDecryptSuccess: vi.fn(),
  auditDecryptFailure: vi.fn(),
  auditBrokerAccess: vi.fn(),
}));

// Must import after mocks
import { GET, POST } from "@/app/api/brokers/route";

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(body?: unknown, method = "POST"): Request {
  return new Request("http://localhost:3000/api/brokers", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getJson(response: Response) {
  return response.json();
}

const VALID_SESSION = { user: { id: "user-uuid-123", email: "user@example.com" } };

// ── Tests ────────────────────────────────────────────────────────────────

describe("broker API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(VALID_SESSION);
  });

  describe("POST /api/brokers", () => {
    it("should encrypt credentials when creating broker connection", async () => {
      mockEncryptApiCredentials.mockReturnValue(
        JSON.stringify({
          v: 1,
          d: "base64encrypteddata",
          i: "base64iv",
          t: "base64tag",
        }),
      );

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "broker-uuid-001",
              brokerName: "binance",
              status: "pending",
              createdAt: new Date(),
            },
          ]),
        }),
      });

      const req = createRequest({
        brokerName: "binance",
        apiKey: "my-api-key",
        apiSecret: "my-api-secret",
      });

      const response = await POST(req);
      const body = await getJson(response);

      expect(response.status).toBe(201);
      expect(body.broker.id).toBe("broker-uuid-001");
      expect(body.broker.brokerName).toBe("binance");

      // Verify encryption was called with credentials
      expect(mockEncryptApiCredentials).toHaveBeenCalledWith(
        JSON.stringify({ apiKey: "my-api-key", apiSecret: "my-api-secret" }),
      );
    });

    it("should return 401 when no session", async () => {
      mockAuth.mockResolvedValue(null);

      const req = createRequest({
        brokerName: "binance",
        apiKey: "key",
        apiSecret: "secret",
      });

      const response = await POST(req);
      const body = await getJson(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when brokerName is missing", async () => {
      const req = createRequest({
        apiKey: "key",
        apiSecret: "secret",
      });

      const response = await POST(req);
      const body = await getJson(response);

      expect(response.status).toBe(400);
      expect(body.error).toContain("required");
    });
  });

  describe("GET /api/brokers", () => {
    it("should NOT return encrypted credentials", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: "broker-uuid-001",
              brokerName: "binance",
              status: "active",
              createdAt: new Date(),
            },
            {
              id: "broker-uuid-002",
              brokerName: "coinbase",
              status: "pending",
              createdAt: new Date(),
            },
          ]),
        }),
      });

      const response = await GET();
      const body = await getJson(response);

      expect(response.status).toBe(200);
      expect(body.brokers).toHaveLength(2);

      for (const broker of body.brokers) {
        expect(broker.encryptedApiCredentials).toBeUndefined();
        expect(broker.encryptionIv).toBeUndefined();
        expect(broker.encryptionTag).toBeUndefined();
        expect(broker.apiKey).toBeUndefined();
        expect(broker.apiSecret).toBeUndefined();
      }

      expect(body.brokers[0].id).toBe("broker-uuid-001");
      expect(body.brokers[0].brokerName).toBe("binance");
      expect(body.brokers[0].status).toBe("active");
    });

    it("should return 401 when no session", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const body = await getJson(response);

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });
});
