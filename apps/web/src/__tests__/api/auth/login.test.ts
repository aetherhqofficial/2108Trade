import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted to avoid ReferenceError) ─────────────────────────────

const { mockDbSelect, mockVerifyPassword } = vi.hoisted(() => ({
  mockDbSelect: vi.fn(),
  mockVerifyPassword: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
  },
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: mockVerifyPassword,
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

// ── Tests ────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with correct credentials (200)", async () => {
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "user-uuid-123",
            email: "user@example.com",
            passwordHash: "$2b$12$somehash",
          },
        ]),
      }),
    });

    mockVerifyPassword.mockResolvedValue(true);

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
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "user-uuid-123",
            email: "user@example.com",
            passwordHash: "$2b$12$somehash",
          },
        ]),
      }),
    });

    mockVerifyPassword.mockResolvedValue(false);

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
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

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
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: "user-uuid-456",
            email: "test@example.com",
            passwordHash: "$2b$12$somehash",
          },
        ]),
      }),
    });

    mockVerifyPassword.mockResolvedValue(true);

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
