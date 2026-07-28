import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted to avoid ReferenceError) ─────────────────────────────

const {
  mockDbSelect,
  mockDbInsert,
  mockVerifyPassword,
} = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockVerifyPassword: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
  },
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: mockVerifyPassword,
}));

vi.mock("@/lib/lockout", () => ({
  checkLockout: vi.fn(() => ({ locked: false, remainingAttempts: 5 })),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
}));

// Must import after mocks
import { POST } from "@/app/api/auth/login/route";

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getJson(response: Response) {
  return response.json();
}

/**
 * Build a chain for `db.select().from().where().limit()`.
 * The chain resolves via `await` to `resolvedValue`.
 */
function selectChain(resolvedValue: any[]) {
  const limitFn = vi.fn(() => ({
    then: (resolve: Function) => resolve(resolvedValue),
  }));
  const whereObj = {
    then: (resolve: Function) => resolve(resolvedValue),
    limit: limitFn,
    and: (...args: any[]) => args,
    eq: (a: any, b: any) => ({ left: a, right: b }),
  };
  const fromObj = {
    where: vi.fn(() => whereObj),
    innerJoin: vi.fn(() => fromObj),
  };
  return {
    then: (resolve: Function) => resolve(resolvedValue),
    from: vi.fn(() => fromObj),
  };
}

/**
 * Build a chain for `db.insert().values()`.
 * The chain is a function-like object that supports chaining.
 */
function insertChain() {
  const chain: any = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };
  return chain;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with correct credentials (200)", async () => {
    let selectCalls = 0;
    mockDbSelect.mockImplementation(() => {
      selectCalls++;
      // First call: user lookup returns the user
      // Second call: MFA check returns empty (no MFA)
      if (selectCalls === 1) {
        return selectChain([
          {
            id: "user-uuid-123",
            email: "user@example.com",
            passwordHash: "$2b$12$somehash",
          },
        ]);
      }
      return selectChain([]);
    });

    mockVerifyPassword.mockResolvedValue(true);
    mockDbInsert.mockReturnValue(insertChain());

    const req = createRequest({
      email: "user@example.com",
      password: "correctPassword",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(200);
    expect(body.user.id).toBe("user-uuid-123");
    expect(body.user.email).toBe("user@example.com");
  });

  it("should reject wrong password (401)", async () => {
    mockDbSelect.mockReturnValue(
      selectChain([
        {
          id: "user-uuid-123",
          email: "user@example.com",
          passwordHash: "$2b$12$somehash",
        },
      ]),
    );

    mockVerifyPassword.mockResolvedValue(false);
    mockDbInsert.mockReturnValue(insertChain());

    const req = createRequest({
      email: "user@example.com",
      password: "wrongPassword",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(401);
    expect(body.error).toContain("Invalid email or password");
  });

  it("should reject non-existent user (401)", async () => {
    mockDbSelect.mockReturnValue(selectChain([]));
    mockDbInsert.mockReturnValue(insertChain());

    const req = createRequest({
      email: "nonexistent@example.com",
      password: "somePassword",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(401);
    expect(body.error).toContain("Invalid email or password");
  });

  it("should reject when email is missing (400)", async () => {
    const req = createRequest({
      password: "somePassword",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("should reject when password is missing (400)", async () => {
    const req = createRequest({
      email: "user@example.com",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("should normalize email to lowercase on lookup", async () => {
    let selectCalls = 0;
    mockDbSelect.mockImplementation(() => {
      selectCalls++;
      if (selectCalls === 1) {
        return selectChain([
          {
            id: "user-uuid-456",
            email: "test@example.com",
            passwordHash: "$2b$12$somehash",
          },
        ]);
      }
      return selectChain([]);
    });

    mockVerifyPassword.mockResolvedValue(true);
    mockDbInsert.mockReturnValue(insertChain());

    const req = createRequest({
      email: "  Test@Example.COM  ",
      password: "correctPassword",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(200);
    expect(body.user.email).toBe("test@example.com");
  });
});
