/**
 * Permission Utilities
 * Core functions for permission checking and management
 */

import { prisma } from '@/lib/prisma';

export interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  roleId: string | null;
  isActive: boolean;
  role?: {
    id: string;
    name: string;
    slug: string;
    isSystem: boolean;
    permissions: {
      permission: {
        id: string;
        slug: string;
        name: string;
        module: string;
      };
    }[];
  } | null;
}

/**
 * Check if user is super admin
 * Super admins bypass all permission checks
 */
export function isSuperAdmin(user: UserWithPermissions): boolean {
  return user.role?.slug === 'super_admin';
}

/**
 * Get all permission slugs for a user
 */
export function getUserPermissions(user: UserWithPermissions): string[] {
  if (!user.role || !user.role.permissions) {
    return [];
  }
  
  return user.role.permissions.map(rp => rp.permission.slug);
}

/**
 * Check if user has a specific permission
 * Super admins always return true
 */
export function hasPermission(
  user: UserWithPermissions,
  permissionSlug: string
): boolean {
  // Super admin bypasses all checks
  if (isSuperAdmin(user)) {
    return true;
  }
  
  const permissions = getUserPermissions(user);
  return permissions.includes(permissionSlug);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  user: UserWithPermissions,
  permissionSlugs: string[]
): boolean {
  // Super admin bypasses all checks
  if (isSuperAdmin(user)) {
    return true;
  }
  
  const permissions = getUserPermissions(user);
  return permissionSlugs.some(slug => permissions.includes(slug));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  user: UserWithPermissions,
  permissionSlugs: string[]
): boolean {
  // Super admin bypasses all checks
  if (isSuperAdmin(user)) {
    return true;
  }
  
  const permissions = getUserPermissions(user);
  return permissionSlugs.every(slug => permissions.includes(slug));
}

/**
 * Get user with role and permissions from database
 */
export async function getUserWithPermissions(
  userId: string
): Promise<UserWithPermissions | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return user;
}

/**
 * Get all permissions grouped by module
 */
export async function getAllPermissionsGrouped() {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { slug: 'asc' }],
  });

  const grouped: Record<string, typeof permissions> = {};
  
  for (const permission of permissions) {
    if (!grouped[permission.module]) {
      grouped[permission.module] = [];
    }
    grouped[permission.module].push(permission);
  }

  return grouped;
}

/**
 * Get role with permissions
 */
export async function getRoleWithPermissions(roleId: string) {
  return prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}

/**
 * Assign permissions to role
 */
export async function assignPermissionsToRole(
  roleId: string,
  permissionIds: string[]
) {
  // Remove existing permissions
  await prisma.rolePermission.deleteMany({
    where: { roleId },
  });

  // Add new permissions
  await prisma.rolePermission.createMany({
    data: permissionIds.map(permissionId => ({
      roleId,
      permissionId,
    })),
  });
}

/**
 * Check if role is system role (cannot be deleted)
 */
export async function isSystemRole(roleId: string): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { isSystem: true },
  });
  
  return role?.isSystem || false;
}
