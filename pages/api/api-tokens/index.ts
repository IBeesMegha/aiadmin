/**
 * API Tokens Management
 * GET /api/api-tokens - List all tokens (without actual token values)
 * POST /api/api-tokens - Create new API token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { generateApiToken } from '@/lib/api-tokens/generator';
import { getAccessToken } from '@/lib/auth/cookies';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify user authentication
    const token = getAccessToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No access token found',
      });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token',
      });
    }

    const userId = payload.userId;

    if (req.method === 'GET') {
      // List all API tokens for the user
      const tokens = await prisma.apiToken.findMany({
        where: {
          createdById: userId,
        },
        include: {
          endpoints: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Remove actual token values from response
      const safeTokens = tokens.map((token) => ({
        id: token.id,
        name: token.name,
        description: token.description,
        type: token.type,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
        isActive: token.isActive,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        createdBy: token.createdBy,
        endpoints: token.endpoints,
        endpointCount: token.endpoints.length,
        // Show only last 8 characters of token
        tokenPreview: `...${token.token.slice(-8)}`,
      }));

      return res.status(200).json({
        success: true,
        data: safeTokens,
      });
    }

    if (req.method === 'POST') {
      const { name, description, type, expiresIn, endpoints } = req.body;

      // Validate required fields
      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'Name and type are required',
        });
      }

      // Validate type
      if (!['read_only', 'full_access', 'custom'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid token type. Must be: read_only, full_access, or custom',
        });
      }

      // Validate endpoints for custom type
      if (type === 'custom' && (!endpoints || endpoints.length === 0)) {
        return res.status(400).json({
          success: false,
          error: 'Custom tokens require at least one endpoint permission',
        });
      }

      // Calculate expiration date
      let expiresAt: Date | null = null;
      if (expiresIn && expiresIn !== 'unlimited') {
        const days = parseInt(expiresIn);
        if (!isNaN(days)) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + days);
        }
      }

      // Generate unique token
      const token = generateApiToken();

      // Create token in database with endpoints
      const apiToken = await prisma.apiToken.create({
        data: {
          name,
          description,
          token,
          type,
          expiresAt,
          createdById: userId,
          endpoints: {
            create: (endpoints || []).map((ep: any) => ({
              module: ep.module,
              endpoint: ep.endpoint,
              method: ep.method,
            })),
          },
        },
        include: {
          endpoints: true,
        },
      });

      // Return the token ONLY on creation (user must save it)
      return res.status(201).json({
        success: true,
        data: {
          id: apiToken.id,
          name: apiToken.name,
          description: apiToken.description,
          type: apiToken.type,
          token: apiToken.token, // Only shown once!
          expiresAt: apiToken.expiresAt,
          endpoints: apiToken.endpoints,
        },
        message: 'API token created successfully. Save this token - it will not be shown again!',
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error: any) {
    console.error('API tokens error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
