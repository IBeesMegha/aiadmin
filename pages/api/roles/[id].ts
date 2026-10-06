/**
 * Role API Route
 * GET /api/roles/[id] - Get role by ID
 * PUT /api/roles/[id] - Update role
 * DELETE /api/roles/[id] - Delete role
 */

import type { NextApiResponse } from 'next';
import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { prisma } from '@/lib/prisma';
import { isSystemRole } from '@/lib/rbac/permissions';
import { z } from 'zod';

const updateRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid role ID',
    });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, id);
  } else if (req.method === 'PUT') {
    return handlePut(req, res, id);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, id);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { role },
    });
  } catch (error: any) {
    console.error('Get role error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch role',
    });
  }
}

async function handlePut(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    // Prevent editing system roles
    if (existingRole.isSystem) {
      return res.status(400).json({
        success: false,
        error: 'System roles cannot be modified',
      });
    }

    // Validate request body
    const validatedData = updateRoleSchema.parse(req.body);

    // Prepare update data
    const updateData: any = {};

    if (validatedData.name) {
      updateData.name = validatedData.name;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }

    // Update role
    const role = await prisma.role.update({
      where: { id },
      data: updateData,
    });

    // Update permissions if provided
    if (validatedData.permissionIds !== undefined) {
      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      if (validatedData.permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: validatedData.permissionIds.map(permissionId => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }

    // Fetch updated role with permissions
    const updatedRole = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: { role: updatedRole },
      message: 'Role updated successfully',
    });
  } catch (error: any) {
    console.error('Update role error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update role',
    });
  }
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
      });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        error: 'System roles cannot be deleted',
      });
    }

    // Prevent deleting roles with users
    if (role._count.users > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete role with ${role._count.users} assigned user(s)`,
      });
    }

    // Delete role (permissions will be cascade deleted)
    await prisma.role.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete role error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete role',
    });
  }
}

export default function (req: any, res: NextApiResponse) {
  if (req.method === 'GET') {
    return requirePermission('roles.read')(req, res, handler);
  } else if (req.method === 'PUT') {
    return requirePermission('roles.update')(req, res, handler);
  } else if (req.method === 'DELETE') {
    return requirePermission('roles.delete')(req, res, handler);
  }
  return handler(req, res);
}
