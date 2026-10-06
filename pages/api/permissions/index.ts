/**
 * Permissions API Route
 * GET /api/permissions - List all permissions
 */

import type { NextApiResponse } from 'next';
import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { getAllPermissionsGrouped } from '@/lib/rbac/permissions';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const permissionsGrouped = await getAllPermissionsGrouped();

    return res.status(200).json({
      success: true,
      data: { permissions: permissionsGrouped },
    });
  } catch (error: any) {
    console.error('Get permissions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions',
    });
  }
}

export default function (req: any, res: NextApiResponse) {
  return requirePermission('roles.read')(req, res, handler);
}
