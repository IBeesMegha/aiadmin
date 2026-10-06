/**
 * Roles API Route
 * GET /api/roles - List all roles
 * POST /api/roles - Create new role
 */

import type { NextApiResponse } from 'next';
import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9_]+$/, 'Slug must be lowercase with underscores only'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).default([]),
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                slug: true,
                module: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: { roles },
    });
  } catch (error: any) {
    console.error('Get roles error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch roles',
    });
  }
}

async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Validate request body
    const validatedData = createRoleSchema.parse(req.body);

    // Check if slug already exists
    const existingRole = await prisma.role.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        error: 'Role slug already exists',
      });
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        isSystem: false,
      },
    });

    // Assign permissions
    if (validatedData.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: validatedData.permissionIds.map(permissionId => ({
          roleId: role.id,
          permissionId,
        })),
      });
    }

    // Fetch role with permissions
    const roleWithPermissions = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: { role: roleWithPermissions },
      message: 'Role created successfully',
    });
  } catch (error: any) {
    console.error('Create role error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create role',
    });
  }
}

export default function (req: any, res: NextApiResponse) {
  if (req.method === 'GET') {
    return requirePermission('roles.read')(req, res, handler);
  } else if (req.method === 'POST') {
    return requirePermission('roles.create')(req, res, handler);
  }
  return handler(req, res);
}
