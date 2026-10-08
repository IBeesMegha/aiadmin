/**
 * API Token Management - Single Token
 * GET /api/api-tokens/[id] - Get token details
 * PATCH /api/api-tokens/[id] - Update token
 * DELETE /api/api-tokens/[id] - Delete token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';
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

    try {
      verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token',
      });
    }

    const tokenId = req.query.id as string;

    if (req.method === 'GET') {
      const apiToken = await prisma.apiToken.findUnique({
        where: { id: tokenId },
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
      });

      if (!apiToken) {
        return res.status(404).json({
          success: false,
          error: 'Token not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          id: apiToken.id,
          name: apiToken.name,
          description: apiToken.description,
          type: apiToken.type,
          expiresAt: apiToken.expiresAt,
          lastUsedAt: apiToken.lastUsedAt,
          isActive: apiToken.isActive,
          createdAt: apiToken.createdAt,
          updatedAt: apiToken.updatedAt,
          createdBy: apiToken.createdBy,
          endpoints: apiToken.endpoints,
          tokenPreview: `...${apiToken.token.slice(-8)}`,
        },
      });
    }

    if (req.method === 'PATCH') {
      const { name, description, isActive, endpoints } = req.body;

      const existingToken = await prisma.apiToken.findUnique({
        where: { id: tokenId },
      });

      if (!existingToken) {
        return res.status(404).json({
          success: false,
          error: 'Token not found',
        });
      }

      // Update token
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update token (no need to deactivate others - multiple tokens can be active)
      const updatedToken = await prisma.apiToken.update({
        where: { id: tokenId },
        data: updateData,
        include: {
          endpoints: true,
        },
      });

      // Update endpoints if provided (only for custom tokens)
      if (endpoints !== undefined && Array.isArray(endpoints)) {
        // Delete existing endpoints
        await prisma.apiTokenEndpoint.deleteMany({
          where: { tokenId },
        });

        // Create new endpoints
        await prisma.apiTokenEndpoint.createMany({
          data: endpoints.map((ep: any) => ({
            tokenId,
            module: ep.module,
            endpoint: ep.endpoint,
            method: ep.method,
          })),
        });
      }

      // Fetch updated token with endpoints
      const finalToken = await prisma.apiToken.findUnique({
        where: { id: tokenId },
        include: {
          endpoints: true,
        },
      });

      return res.status(200).json({
        success: true,
        data: finalToken,
      });
    }

    if (req.method === 'DELETE') {
      const existingToken = await prisma.apiToken.findUnique({
        where: { id: tokenId },
      });

      if (!existingToken) {
        return res.status(404).json({
          success: false,
          error: 'Token not found',
        });
      }

      await prisma.apiToken.delete({
        where: { id: tokenId },
      });

      return res.status(200).json({
        success: true,
        message: 'Token deleted successfully',
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error: any) {
    console.error('API token error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
