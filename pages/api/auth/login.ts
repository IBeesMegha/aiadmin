/**
 * Login API Route
 * POST /api/auth/login
 * Authenticates user and returns JWT tokens
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser } from '@/lib/auth/auth';
import { setAuthCookies } from '@/lib/auth/cookies';
import { loginSchema } from '@/lib/validators/auth';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Test database connection
    await prisma.$connect();
    
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Get session metadata
    const userAgent = req.headers['user-agent'];
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress;

    // Authenticate user
    const authResult = await authenticateUser(validatedData, {
      userAgent,
      ipAddress,
    });

    // Set secure HTTP-only cookies
    setAuthCookies(res, authResult.accessToken, authResult.refreshToken);

    // Get user with permissions for response
    const { getUserWithPermissions, getUserPermissions } = await import('@/lib/rbac/permissions');
    const userWithPerms = await getUserWithPermissions(authResult.user.id);
    const permissions = userWithPerms ? getUserPermissions(userWithPerms) : [];

    // Return user data (without tokens in body for security)
    return res.status(200).json({
      success: true,
      data: {
        user: authResult.user,
        permissions,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);

    // Handle validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    // Handle authentication errors
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed',
    });
  } finally {
    await prisma.$disconnect();
  }
}
