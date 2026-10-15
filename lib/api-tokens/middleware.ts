/**
 * API Token Authentication Middleware
 * Validates API tokens and checks endpoint permissions
 * 
 * IMPORTANT: This middleware is ONLY for frontend CMS APIs under /cms/*
 * Admin panel APIs under /api/* use JWT authentication and should NOT accept API tokens.
 * 
 * API Namespaces:
 * - /api/*   → Admin JWT authentication (authMiddleware)
 * - /cms/*   → Bearer API token authentication (withApiToken)
 * - /v1/*   → Bearer API token authentication (withApiToken)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { matchEndpoint } from './endpoints';

export interface ApiTokenRequest extends NextApiRequest {
  apiToken?: {
    id: string;
    name: string;
    type: string;
    createdById: string;
  };
}

/**
 * Middleware to authenticate API token from request
 * This should ONLY be used on frontend CMS routes under /cms/*
 * Admin routes under /api/* should use JWT authentication instead
 */
export async function authenticateApiToken(
  req: ApiTokenRequest,
  res: NextApiResponse,
  next: () => void
) {
  try {
    // CRITICAL: Block API tokens from accessing admin routes
    const requestPath = req.url?.split('?')[0] || '';
    
    console.log('[API Token Middleware] REQUEST RECEIVED:', {
      path: requestPath,
      method: req.method,
      hasAuthHeader: !!req.headers.authorization,
    });
    
    // Admin routes are NOT accessible with API tokens
    if (isAdminRoute(requestPath)) {
      console.log('[API Token Middleware] ✗ Admin route blocked for API token');
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'API tokens cannot access admin routes. Use JWT authentication for admin panel.',
      });
    }
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        message: 'API Token required. Format: Authorization: Bearer YOUR_TOKEN',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Find token in database
    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
      include: {
        endpoints: true,
      },
    });

    if (!apiToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API token',
      });
    }

    // Check if token is active
    if (!apiToken.isActive) {
      return res.status(401).json({
        success: false,
        error: 'API token is inactive',
      });
    }

    // Check if token is expired
    if (apiToken.expiresAt && new Date() > apiToken.expiresAt) {
      return res.status(401).json({
        success: false,
        error: 'API token has expired',
      });
    }

    // Update last used timestamp (don't await to avoid slowing down request)
    prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    }).catch((err) => console.error('Failed to update lastUsedAt:', err));

    // Attach token info to request
    req.apiToken = {
      id: apiToken.id,
      name: apiToken.name,
      type: apiToken.type,
      createdById: apiToken.createdById,
    };

    const requestMethod = req.method?.toUpperCase() || 'GET';

    // ===== TOKEN TYPE AUTHORIZATION =====
    // Different authorization logic based on token type
    
    console.log('[API Token Auth]', {
      tokenId: apiToken.id,
      tokenName: apiToken.name,
      tokenType: apiToken.type,
      requestPath,
      requestMethod,
      endpointCount: apiToken.endpoints.length,
    });
    
    let hasPermission = false;

    if (apiToken.type === 'read_only') {
      // READ ONLY: Allow ONLY GET requests, reject all write operations
      if (requestMethod === 'GET') {
        hasPermission = true;
        console.log('[API Token Auth] ✓ Read Only token - GET request allowed');
      } else {
        console.log('[API Token Auth] ✗ Read Only token - Blocked', requestMethod);
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Read Only tokens can only perform GET requests. ${requestMethod} is not allowed.`,
        });
      }
    } else if (apiToken.type === 'full_access') {
      // FULL ACCESS: Allow ALL HTTP methods on all public endpoints
      // No need to check specific endpoints - full access to everything
      const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      if (allowedMethods.includes(requestMethod)) {
        hasPermission = true;
        console.log('[API Token Auth] ✓ Full Access token - All methods allowed');
      } else {
        console.log('[API Token Auth] ✗ Full Access token - Unsupported method', requestMethod);
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `HTTP method ${requestMethod} is not supported.`,
        });
      }
    } else if (apiToken.type === 'custom') {
      // CUSTOM: Check exact endpoint + method permission from database
      hasPermission = apiToken.endpoints.some((ep) =>
        matchEndpoint(requestPath, ep.endpoint) && ep.method === requestMethod
      );

      console.log('[API Token Auth] Custom token - Checking permissions:', {
        hasPermission,
        allowedEndpoints: apiToken.endpoints.map(ep => `${ep.method} ${ep.endpoint}`),
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `This API token does not have permission to ${requestMethod} ${requestPath}`,
        });
      }
    } else {
      // Unknown token type - deny access
      console.log('[API Token Auth] ✗ Unknown token type:', apiToken.type);
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Unknown token type: ${apiToken.type}`,
      });
    }

    // Authorization passed - proceed to handler
    console.log('[API Token Auth] ✓ Authorization passed - Calling handler');
    next();
  } catch (error) {
    console.error('API token authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Check if a route is an admin route that should NOT accept API tokens
 * Admin routes are under /api/* (except legacy /api/public/*)
 * CMS routes are under /cms/* and REQUIRE API tokens
 */
function isAdminRoute(path: string): boolean {
  // /api/* routes are admin routes (with JWT auth)
  // EXCEPT /api/public/* which is legacy and still uses API tokens
  if (path.startsWith('/api/')) {
    // Allow legacy /api/public/* to use API tokens for backwards compatibility
    if (path.startsWith('/api/public/')) {
      return false; // Not an admin route, can use API tokens
    }
    // All other /api/* routes are admin-only
    return true;
  }

  // /cms/* routes are frontend CMS routes (require API tokens)
  if (path.startsWith('/cms/')) {
    return false; // Not an admin route, requires API tokens
  }

  // /v1/* routes are public API routes (require API tokens)
  if (path.startsWith('/v1/')) {
    return false; // Not an admin route, requires API tokens
  }

  return false;
}

/**
 * Higher-order function to wrap API routes with token authentication
 * Usage: export default withApiToken(handler)
 */
export function withApiToken(
  handler: (req: ApiTokenRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: ApiTokenRequest, res: NextApiResponse) => {
    let authPassed = false;

    // Await the authenticator promise directly. On success it invokes the
    // `next` callback (setting authPassed); on failure it sends the error
    // response and resolves without calling `next`.
    await Promise.resolve(
      authenticateApiToken(req, res, () => {
        authPassed = true;
      })
    );

    // Only call handler if authentication passed
    // If response was already sent by middleware, don't call handler
    if (!authPassed || res.headersSent) {
      return;
    }

    return handler(req, res);
  };
}

