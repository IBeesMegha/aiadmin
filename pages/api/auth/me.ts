/**
 * Current User API Route
 * GET /api/auth/me
 * Returns current authenticated user data with permissions
 */

import type { NextApiResponse } from 'next';
import { withAuth, type AuthenticatedRequest } from '@/lib/middlewares/api/auth-middleware';
import { getUserPermissions } from '@/lib/rbac/permissions';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Get user permissions
    const permissions = getUserPermissions(req.user);

    // User is already attached by middleware
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          roleId: req.user.roleId,
          isActive: req.user.isActive,
          role: req.user.role ? {
            id: req.user.role.id,
            name: req.user.role.name,
            slug: req.user.role.slug,
          } : null,
        },
        permissions,
      },
    });
  } catch (error: any) {
    console.error('Get current user error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get user data',
    });
  }
}

export default function (req: any, res: NextApiResponse) {
  return withAuth(req, res, handler);
}
