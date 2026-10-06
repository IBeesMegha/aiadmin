/**
 * User API Route
 * GET /api/users/[id] - Get user by ID
 * PUT /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user
 */

import type { NextApiResponse } from 'next';
import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  roleId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID',
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
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
}

async function handlePut(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prevent users from deactivating themselves
    if (id === req.user.id && req.body.isActive === false) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account',
      });
    }

    // Validate request body
    const validatedData = updateUserSchema.parse(req.body);

    // Check if email is being changed and already exists
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email.toLowerCase() },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists',
        });
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (validatedData.email) {
      updateData.email = validatedData.email.toLowerCase();
    }
    if (validatedData.name) {
      updateData.name = validatedData.name;
    }
    if (validatedData.password) {
      updateData.password = await hashPassword(validatedData.password);
    }
    if (validatedData.roleId !== undefined) {
      updateData.roleId = validatedData.roleId;
    }
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: { user },
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('Update user error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
}

async function handleDelete(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    // Prevent users from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account',
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Delete user (sessions will be cascade deleted)
    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
}

export default function (req: any, res: NextApiResponse) {
  if (req.method === 'GET') {
    return requirePermission('users.read')(req, res, handler);
  } else if (req.method === 'PUT') {
    return requirePermission('users.update')(req, res, handler);
  } else if (req.method === 'DELETE') {
    return requirePermission('users.delete')(req, res, handler);
  }
  return handler(req, res);
}
