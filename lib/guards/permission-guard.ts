/**
 * Permission Guard Middleware
 * Protects API routes with permission checks
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getAccessToken } from '@/lib/auth/cookies';
import { getUserWithPermissions, hasPermission, hasAnyPermission, isSuperAdmin } from '@/lib/rbac/permissions';
import type { UserWithPermissions } from '@/lib/rbac/permissions';

export interface AuthenticatedRequest extends NextApiRequest {
  user: UserWithPermissions;
}

/**
 * Require specific permission
 * Usage: requirePermission('users.create')
 */
export function requirePermission(permissionSlug: string) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
  ): Promise<void> => {
    try {
      // Get and verify access token
      const accessToken = getAccessToken(req);
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const decoded = verifyAccessToken(accessToken);

      // Get user with permissions
      const user = await getUserWithPermissions(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      // Check permission
      if (!hasPermission(user, permissionSlug)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: permissionSlug,
        });
      }

      // Attach user to request
      (req as AuthenticatedRequest).user = user;

      // Call handler
      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Permission guard error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  };
}

/**
 * Require any of the specified permissions
 * Usage: requireAnyPermission(['users.read', 'users.create'])
 */
export function requireAnyPermission(permissionSlugs: string[]) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
  ): Promise<void> => {
    try {
      const accessToken = getAccessToken(req);
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const decoded = verifyAccessToken(accessToken);
      const user = await getUserWithPermissions(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      if (!hasAnyPermission(user, permissionSlugs)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: permissionSlugs,
        });
      }

      (req as AuthenticatedRequest).user = user;
      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Permission guard error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  };
}

/**
 * Require super admin role
 */
export function requireSuperAdmin() {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
  ): Promise<void> => {
    try {
      const accessToken = getAccessToken(req);
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const decoded = verifyAccessToken(accessToken);
      const user = await getUserWithPermissions(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      if (!isSuperAdmin(user)) {
        return res.status(403).json({
          success: false,
          error: 'Super admin access required',
        });
      }

      (req as AuthenticatedRequest).user = user;
      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Super admin guard error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  };
}

/**
 * Basic authentication without permission check
 * Just verifies user is logged in
 */
export function requireAuth() {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
  ): Promise<void> => {
    try {
      const accessToken = getAccessToken(req);
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const decoded = verifyAccessToken(accessToken);
      const user = await getUserWithPermissions(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      (req as AuthenticatedRequest).user = user;
      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Auth guard error:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  };
}
