/**
 * Users API Route
 * GET /api/users - List all users
 * POST /api/users - Create new user
 */

import type { NextApiResponse } from 'next';
import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().optional(),
  isActive: z.boolean().default(true),
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
    const { search, roleId, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (roleId) {
      where.roleId = roleId as string;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
}

async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Validate request body
    const validatedData = createUserSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        name: validatedData.name,
        password: hashedPassword,
        roleId: validatedData.roleId || null,
        isActive: validatedData.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: { user },
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('Create user error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
}

export default function (req: any, res: NextApiResponse) {
  if (req.method === 'GET') {
    return requirePermission('users.read')(req, res, handler);
  } else if (req.method === 'POST') {
    return requirePermission('users.create')(req, res, handler);
  }
  return handler(req, res);
}
