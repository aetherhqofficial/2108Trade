// ── Role-Based Access Control (RBAC) ──
// Provides functions to query and manage user roles and permissions.
// Uses the existing roles, permissions, user_roles, and role_permissions tables.

import { db } from "@/lib/db";
import {
  roles,
  permissions,
  userRoles,
  rolePermissions,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ── Default Roles & Permissions ──────────────────────────────────────────

export const DEFAULT_PERMISSIONS = [
  { name: "trade.create", resource: "trade", action: "create" as const },
  { name: "trade.read", resource: "trade", action: "read" as const },
  { name: "trade.execute", resource: "trade", action: "manage" as const },
  { name: "portfolio.read", resource: "portfolio", action: "read" as const },
  { name: "portfolio.manage", resource: "portfolio", action: "manage" as const },
  { name: "market.read", resource: "market", action: "read" as const },
  { name: "alerts.manage", resource: "alerts", action: "manage" as const },
  { name: "admin.manage", resource: "admin", action: "manage" as const },
];

export const DEFAULT_ROLES: Array<{
  name: string;
  description: string;
  permissionNames: string[];
}> = [
  {
    name: "admin",
    description: "Full system access with all permissions",
    permissionNames: DEFAULT_PERMISSIONS.map((p) => p.name),
  },
  {
    name: "trader",
    description: "Can create, read, and execute trades; read portfolio",
    permissionNames: [
      "trade.create",
      "trade.read",
      "trade.execute",
      "portfolio.read",
    ],
  },
  {
    name: "analyst",
    description: "Can read portfolio and market data",
    permissionNames: ["portfolio.read", "market.read"],
  },
  {
    name: "viewer",
    description: "Read-only portfolio access",
    permissionNames: ["portfolio.read"],
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────

let _seeded = false;

/**
 * Seeds the default roles and permissions if they don't exist.
 * Idempotent — safe to call multiple times.
 */
export async function seedRolesAndPermissions(): Promise<void> {
  if (_seeded) return;

  try {
    // Seed permissions
    for (const perm of DEFAULT_PERMISSIONS) {
      const [existing] = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.name, perm.name))
        .limit(1);

      if (!existing) {
        await db.insert(permissions).values({
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
        });
      }
    }

    // Get all permission IDs by name
    const allPerms = await db
      .select({ id: permissions.id, name: permissions.name })
      .from(permissions);

    const permMap = new Map(allPerms.map((p) => [p.name, p.id]));

    // Seed roles
    for (const roleDef of DEFAULT_ROLES) {
      const [existingRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, roleDef.name))
        .limit(1);

      let roleId: string;

      if (!existingRole) {
        const [created] = await db
          .insert(roles)
          .values({
            name: roleDef.name,
            description: roleDef.description,
          })
          .returning({ id: roles.id });
        roleId = created.id;
      } else {
        roleId = existingRole.id;
      }

      // Assign permissions to role
      for (const permName of roleDef.permissionNames) {
        const permId = permMap.get(permName);
        if (!permId) continue;

        const [existingMapping] = await db
          .select({ roleId: rolePermissions.roleId })
          .from(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleId, roleId),
              eq(rolePermissions.permissionId, permId),
            ),
          )
          .limit(1);

        if (!existingMapping) {
          await db.insert(rolePermissions).values({
            roleId,
            permissionId: permId,
          });
        }
      }
    }

    _seeded = true;
  } catch {
    // Silently fail — seeding is best-effort on cold start.
    // The app should still work; admin can seed manually if needed.
  }
}

// ── Query Functions ───────────────────────────────────────────────────────

/**
 * Returns all role names assigned to a user.
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));

  return rows.map((r) => r.name);
}

/**
 * Returns all permissions (resource + action) for a user
 * via their role memberships.
 */
export async function getUserPermissions(
  userId: string,
): Promise<{ resource: string; action: string }[]> {
  const rows = await db
    .select({
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId));

  return rows.map((r) => ({
    resource: r.resource,
    action: r.action,
  }));
}

/**
 * Checks if a user has a specific permission on a resource.
 * The "manage" action grants all actions on that resource.
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const perms = await getUserPermissions(userId);

  return perms.some(
    (p) =>
      p.resource === resource &&
      (p.action === action || p.action === "manage"),
  );
}

/**
 * Checks if a user has a specific role.
 */
export async function hasRole(
  userId: string,
  roleName: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(eq(userRoles.userId, userId), eq(roles.name, roleName)),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Assigns a role to a user. Creates the role if it doesn't exist.
 */
export async function assignRole(
  userId: string,
  roleName: string,
): Promise<void> {
  // Find or create the role
  let [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  if (!role) {
    const [created] = await db
      .insert(roles)
      .values({ name: roleName, description: `Auto-created role: ${roleName}` })
      .returning({ id: roles.id });
    role = created;
  }

  // Check if already assigned
  const [existing] = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, role.id),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(userRoles).values({
      userId,
      roleId: role.id,
    });
  }
}

/**
 * Removes a role from a user.
 */
export async function removeRole(
  userId: string,
  roleName: string,
): Promise<void> {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);

  if (!role) return;

  await db
    .delete(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, role.id),
      ),
    );
}
