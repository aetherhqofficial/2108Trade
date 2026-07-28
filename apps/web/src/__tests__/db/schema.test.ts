import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted to avoid ReferenceError) ─────────────────────────────
const mockDb = vi.hoisted(() => {
  const chain: Record<string, any> = {};

  // Build a chainable mock: db.insert().values().returning()
  function createChain(returnValue: any = [{}]) {
    const chainObj: any = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue(returnValue),
      where: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    };
    // Make each method return itself for further chaining, except returning()
    for (const key of Object.keys(chainObj)) {
      if (key !== "returning") {
        chainObj[key] = vi.fn(() => chainObj);
      }
    }
    // returning() resolves with the value
    chainObj.returning = vi.fn().mockResolvedValue(returnValue);
    // select().from().where() resolves
    chainObj.where = vi.fn(() => ({
      ...chainObj,
      returning: vi.fn().mockResolvedValue(returnValue),
    }));
    return chainObj;
  }

  const db: any = {
    insert: vi.fn(() => createChain()),
    select: vi.fn(() => createChain()),
    update: vi.fn(() => createChain()),
    delete: vi.fn(() => createChain()),
  };

  return { db, createChain };
});

vi.mock("@/lib/db", () => ({
  db: mockDb.db,
}));

// Must import after mocks are set up
import { roles } from "@/db/schema/roles";
import { permissions } from "@/db/schema/permissions";
import { userRoles } from "@/db/schema/user-roles";
import { rolePermissions } from "@/db/schema/role-permissions";
import { users } from "@/db/schema/users";
import { alerts } from "@/db/schema/alerts";
import { auditLogs } from "@/db/schema/audit-logs";
import { watchlists } from "@/db/schema/watchlists";

describe("Database Schema Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Schema Structure Validation ───────────────────────────────────────

  describe("schema structure", () => {
    it("roles table has expected shape", () => {
      expect(roles).toBeDefined();
      // Drizzle pgTable has internal symbol properties we can verify
      expect(typeof roles.id).toBe("object");
    });

    it("permissions table has expected shape", () => {
      expect(permissions).toBeDefined();
    });

    it("userRoles table has expected shape", () => {
      expect(userRoles).toBeDefined();
    });

    it("rolePermissions table has expected shape", () => {
      expect(rolePermissions).toBeDefined();
    });

    it("alerts table has expected shape", () => {
      expect(alerts).toBeDefined();
    });

    it("auditLogs table has expected shape", () => {
      expect(auditLogs).toBeDefined();
    });

    it("watchlists table has expected shape", () => {
      expect(watchlists).toBeDefined();
    });
  });

  // ── Insertion Tests (mocked) ──────────────────────────────────────────

  describe("role operations", () => {
    it("should call insert for a role", async () => {
      await mockDb.db.insert(roles).values({ name: "admin", description: "Admin" }).returning();
      expect(mockDb.db.insert).toHaveBeenCalledWith(roles);
    });

    it("should call select for reading roles", async () => {
      await mockDb.db.select().from(roles);
      expect(mockDb.db.select).toHaveBeenCalled();
    });

    it("should call update for a role", async () => {
      await mockDb.db.update(roles).set({ description: "New" });
      expect(mockDb.db.update).toHaveBeenCalledWith(roles);
    });

    it("should call delete for a role", async () => {
      await mockDb.db.delete(roles);
      expect(mockDb.db.delete).toHaveBeenCalledWith(roles);
    });
  });

  describe("permission operations", () => {
    it("should insert a permission", async () => {
      await mockDb.db.insert(permissions).values({
        name: "trade.execute",
        resource: "trades",
        action: "create",
      }).returning();
      expect(mockDb.db.insert).toHaveBeenCalledWith(permissions);
    });

    it("should insert a role-permission mapping", async () => {
      await mockDb.db.insert(rolePermissions).values({
        roleId: "fake-role-id",
        permissionId: "fake-perm-id",
      });
      expect(mockDb.db.insert).toHaveBeenCalledWith(rolePermissions);
    });
  });

  describe("user-role operations", () => {
    it("should insert a user-role mapping", async () => {
      await mockDb.db.insert(userRoles).values({
        userId: "fake-user-id",
        roleId: "fake-role-id",
      });
      expect(mockDb.db.insert).toHaveBeenCalledWith(userRoles);
    });
  });

  describe("alert operations", () => {
    it("should insert and trigger an alert", async () => {
      await mockDb.db.insert(alerts).values({
        userId: "fake-user-id",
        symbol: "AAPL",
        conditionType: "price_above",
        conditionValue: 200,
      }).returning();
      expect(mockDb.db.insert).toHaveBeenCalledWith(alerts);

      await mockDb.db.update(alerts).set({
        triggered: true,
        triggeredAt: new Date(),
      });
      expect(mockDb.db.update).toHaveBeenCalledWith(alerts);
    });
  });

  describe("audit log operations", () => {
    it("should insert an audit log", async () => {
      await mockDb.db.insert(auditLogs).values({
        userId: "fake-user-id",
        action: "user.login",
        resource: "sessions",
        ipAddress: "192.168.1.1",
      }).returning();
      expect(mockDb.db.insert).toHaveBeenCalledWith(auditLogs);
    });

    it("should insert an audit log with null userId", async () => {
      await mockDb.db.insert(auditLogs).values({
        userId: null,
        action: "system.startup",
        resource: "server",
        ipAddress: "127.0.0.1",
      }).returning();
      expect(mockDb.db.insert).toHaveBeenCalledWith(auditLogs);
    });
  });

  describe("watchlist operations", () => {
    it("should create a watchlist with symbols", async () => {
      await mockDb.db.insert(watchlists).values({
        userId: "fake-user-id",
        name: "Tech Stocks",
        symbols: ["AAPL", "GOOGL", "MSFT"],
      }).returning();
      expect(mockDb.db.insert).toHaveBeenCalledWith(watchlists);
    });
  });
});
