/**
 * API Authentication Middleware
 * Protects API routes by verifying JWT access tokens
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getAccessToken } from '@/lib/auth/cookies';
import { getUserWithPermissions } from '@/lib/rbac/permissions';
import type { UserWithPermissions } from '@/lib/rbac/permissions';

export interface AuthenticatedRequest extends NextApiRequest {
  user: UserWithPermissions;
}

/**
 * Middleware to authenticate API requests
 * Verifies JWT token and attaches user with permissions to request
 */
export async function withAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
): Promise<void> {
  try {
    // Get access token from cookies
    const accessToken = getAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(accessToken);
    } catch (error) {
      // Token is invalid or expired
      return res.status(401).json({
        success: false,
        error: 'Token expired or invalid',
        code: 'TOKEN_EXPIRED',
      });
    }

    // Get user from database with permissions
    const user = await getUserWithPermissions(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    // Call the actual handler
    return handler(req as AuthenticatedRequest, res);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Middleware to check if user has specific role
 */
export function withRole(roles: string[]) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
  ): Promise<void> => {
    return withAuth(req, res, async (authReq, authRes) => {
      const userRole = authReq.user.role?.slug;
      
      if (!userRole || !roles.includes(userRole)) {
        return authRes.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      return handler(authReq, authRes);
    });
  };
}

/**
 * Higher-order function to wrap API handlers with authentication
 * Usage: export default authMiddleware(handler);
 */
export function authMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    return withAuth(req, res, handler as any);
  };
}
