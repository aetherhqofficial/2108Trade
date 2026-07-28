import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

const mockDb = vi.hoisted(() => {
  const builder: any = {
    select: vi.fn(() => builder),
    from: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    set: vi.fn(() => builder),
    values: vi.fn(() => builder),
    where: vi.fn(() => builder),
    returning: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    and: vi.fn((...args: any[]) => args),
    eq: vi.fn((a: any, b: any) => ({ left: a, right: b, type: "eq" })),
  };
  builder.returning.mockResolvedValue([]);
  builder.where.mockReturnValue(builder);
  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);

  const db: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
  };

  return { db, builder };
});

vi.mock("@/lib/db", () => ({
  db: mockDb.db,
}));

// Must import after mocks
import {
  getUserRoles,
  getUserPermissions,
  hasPermission,
  hasRole,
  assignRole,
  removeRole,
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
} from "@/lib/rbac";

describe("RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DEFAULT_PERMISSIONS", () => {
    it("should define 8 default permissions", () => {
      expect(DEFAULT_PERMISSIONS).toHaveLength(8);
    });

    it("should include trade.create permission", () => {
      const perm = DEFAULT_PERMISSIONS.find((p) => p.name === "trade.create");
      expect(perm).toBeDefined();
      expect(perm!.resource).toBe("trade");
      expect(perm!.action).toBe("create");
    });

    it("should include admin.manage permission", () => {
      const perm = DEFAULT_PERMISSIONS.find((p) => p.name === "admin.manage");
      expect(perm).toBeDefined();
      expect(perm!.resource).toBe("admin");
      expect(perm!.action).toBe("manage");
    });
  });

  describe("DEFAULT_ROLES", () => {
    it("should define 4 default roles", () => {
      expect(DEFAULT_ROLES).toHaveLength(4);
    });

    it("should have admin role with all permissions", () => {
      const admin = DEFAULT_ROLES.find((r) => r.name === "admin");
      expect(admin).toBeDefined();
      expect(admin!.permissionNames).toHaveLength(8);
    });

    it("should have viewer role with only portfolio.read", () => {
      const viewer = DEFAULT_ROLES.find((r) => r.name === "viewer");
      expect(viewer).toBeDefined();
      expect(viewer!.permissionNames).toEqual(["portfolio.read"]);
    });
  });

  describe("getUserRoles", () => {
    it("should return role names for a user", async () => {
      mockDb.builder.where.mockResolvedValue([
        { name: "admin" },
        { name: "trader" },
      ]);

      const roles = await getUserRoles("user-1");
      expect(roles).toEqual(["admin", "trader"]);
      expect(mockDb.db.select).toHaveBeenCalled();
    });

    it("should return empty array for user with no roles", async () => {
      mockDb.builder.where.mockResolvedValue([]);

      const roles = await getUserRoles("user-2");
      expect(roles).toEqual([]);
    });
  });

  describe("getUserPermissions", () => {
    it("should return all permissions via role memberships", async () => {
      mockDb.builder.where.mockResolvedValue([
        { resource: "trade", action: "create" },
        { resource: "portfolio", action: "read" },
      ]);

      const perms = await getUserPermissions("user-1");
      expect(perms).toHaveLength(2);
      expect(perms[0]).toEqual({ resource: "trade", action: "create" });
    });
  });

  describe("hasPermission", () => {
    it("should return true when user has exact permission", async () => {
      mockDb.builder.where.mockResolvedValue([
        { resource: "trade", action: "create" },
        { resource: "portfolio", action: "read" },
      ]);

      const result = await hasPermission("user-1", "trade", "create");
      expect(result).toBe(true);
    });

    it("should return true when user has manage permission on resource", async () => {
      mockDb.builder.where.mockResolvedValue([
        { resource: "admin", action: "manage" },
      ]);

      const result = await hasPermission("user-1", "admin", "read");
      expect(result).toBe(true);
    });

    it("should return false when user lacks permission", async () => {
      mockDb.builder.where.mockResolvedValue([
        { resource: "portfolio", action: "read" },
      ]);

      const result = await hasPermission("user-1", "trade", "execute");
      expect(result).toBe(false);
    });
  });

  describe("hasRole", () => {
    it("should return true when user has the role", async () => {
      mockDb.builder.where.mockReturnValue({
        ...mockDb.builder,
        limit: vi.fn().mockResolvedValue([{ id: "role-1" }]),
      });

      const result = await hasRole("user-1", "admin");
      expect(result).toBe(true);
    });

    it("should return false when user lacks the role", async () => {
      mockDb.builder.where.mockReturnValue({
        ...mockDb.builder,
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await hasRole("user-1", "admin");
      expect(result).toBe(false);
    });
  });

  describe("assignRole", () => {
    it("should assign an existing role to a user", async () => {
      // First select finds the role
      mockDb.builder.where
        .mockReturnValueOnce({
          ...mockDb.builder,
          limit: vi.fn().mockResolvedValue([{ id: "role-admin" }]),
        })
        // Second select checks if already assigned
        .mockReturnValueOnce({
          ...mockDb.builder,
          limit: vi.fn().mockResolvedValue([]),
        });

      mockDb.db.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
      } as any);

      await assignRole("user-1", "admin");
      expect(mockDb.db.insert).toHaveBeenCalled();
    });

    it("should create role if it does not exist", async () => {
      // First select finds no role
      mockDb.builder.where
        .mockReturnValueOnce({
          ...mockDb.builder,
          limit: vi.fn().mockResolvedValue([]),
        });

      mockDb.db.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: "new-role" }]),
      } as any);

      // Second select checks if already assigned
      mockDb.builder.where.mockReturnValueOnce({
        ...mockDb.builder,
        limit: vi.fn().mockResolvedValue([]),
      });

      await assignRole("user-1", "custom-role");
      // Should have been called twice: once to create role, once to assign
      expect(mockDb.db.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe("removeRole", () => {
    it("should remove a role from a user", async () => {
      mockDb.builder.where
        .mockReturnValueOnce({
          ...mockDb.builder,
          limit: vi.fn().mockResolvedValue([{ id: "role-admin" }]),
        });

      await removeRole("user-1", "admin");
      expect(mockDb.db.delete).toHaveBeenCalled();
    });

    it("should be a no-op if role does not exist", async () => {
      mockDb.builder.where
        .mockReturnValueOnce({
          ...mockDb.builder,
          limit: vi.fn().mockResolvedValue([]),
        });

      await removeRole("user-1", "nonexistent");
      expect(mockDb.db.delete).not.toHaveBeenCalled();
    });
  });
});
