import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted to avoid ReferenceError) ─────────────────────────────

const { mockDbInsert, mockDbSelect } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("$2b$12$mockedhash"),
}));

// Must import after mocks are set up
import { POST } from "@/app/api/auth/register/route";

// ── Helpers ──────────────────────────────────────────────────────────────

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getJson(response: Response) {
  return response.json();
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user successfully (201)", async () => {
    // No existing user
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "user-uuid-123",
            email: "newuser@example.com",
          },
        ]),
      }),
    });

    const req = createRequest({
      email: "newuser@example.com",
      password: "securePassword123",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(201);
    expect(body.user.id).toBe("user-uuid-123");
    expect(body.user.email).toBe("newuser@example.com");
    expect(body.message).toContain("successful");
  });

  it("should reject duplicate email (409)", async () => {
    // Existing user found
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "existing-id",
            email: "existing@example.com",
            passwordHash: "$2b$12$somehash",
          },
        ]),
      }),
    });

    const req = createRequest({
      email: "existing@example.com",
      password: "somePassword123",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain("already exists");
  });

  it("should reject when email is missing (400)", async () => {
    const req = createRequest({
      password: "somePassword123",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("should reject when password is missing (400)", async () => {
    const req = createRequest({
      email: "test@example.com",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain("required");
  });

  it("should reject short password (400)", async () => {
    const req = createRequest({
      email: "test@example.com",
      password: "short",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain("at least 8");
  });

  it("should normalize email to lowercase", async () => {
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "user-uuid-456",
            email: "test@example.com",
          },
        ]),
      }),
    });

    const req = createRequest({
      email: "  Test@Example.COM  ",
      password: "validPassword123",
    });

    const response = await POST(req);
    const body = await getJson(response);

    expect(response.status).toBe(201);
    expect(body.user.email).toBe("test@example.com");
  });
});
