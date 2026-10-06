/**
 * API Token Authentication Middleware
 * Validates API tokens and checks endpoint permissions
 * 
 * IMPORTANT: This middleware is ONLY for public API endpoints.
 * Admin panel APIs use JWT authentication and should NOT accept API tokens.
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
 * This should ONLY be used on public API routes under /api/public/*
 * Admin routes should use JWT authentication instead
 */
export async function authenticateApiToken(
  req: ApiTokenRequest,
  res: NextApiResponse,
  next: () => void
) {
  try {
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

    // Check endpoint permission
    const requestPath = req.url?.split('?')[0] || ''; // Remove query params
    const requestMethod = req.method?.toUpperCase() || 'GET';

    // Check if this endpoint and method are allowed
    const hasPermission = apiToken.endpoints.some((ep) =>
      matchEndpoint(requestPath, ep.endpoint) && ep.method === requestMethod
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `This API token does not have permission to ${requestMethod} ${requestPath}`,
      });
    }

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
 * Higher-order function to wrap API routes with token authentication
 * Usage: export default withApiToken(handler)
 */
export function withApiToken(
  handler: (req: ApiTokenRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: ApiTokenRequest, res: NextApiResponse) => {
    await new Promise<void>((resolve, reject) => {
      authenticateApiToken(req, res, () => resolve());
    });
    
    // If we reach here, authentication passed
    return handler(req, res);
  };
}

