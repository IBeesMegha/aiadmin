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
      // API tokens are global and shared by all authenticated users.
      const tokens = await prisma.apiToken.findMany({
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

      console.log('[API Tokens] Creating token:', { name, type, expiresIn, endpointsCount: endpoints?.length });

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

      // Fetch available endpoints to auto-assign based on token type
      let endpointsToCreate: any[] = [];

      console.log('[API Tokens] Token type:', type);

      if (type === 'read_only' || type === 'full_access') {
        console.log('[API Tokens] Auto-generating endpoints for', type);
        // Fetch all collection types and single types
        const collectionTypes = await prisma.collectionType.findMany({
          select: { name: true, displayName: true },
        });

        console.log('[API Tokens] Found collections:', collectionTypes.length);

        const singleTypes = await prisma.singleType.findMany({
          select: { name: true, displayName: true },
          distinct: ['name'],
        });

        console.log('[API Tokens] Found single types:', singleTypes.length);

        // Build endpoint list based on token type
        endpointsToCreate = [];

        // Add collection endpoints
        for (const collection of collectionTypes) {
          const collectionEndpoints = [
            {
              module: `collection_${collection.name}`,
              endpoint: `/api/public/collections/${collection.name}`,
              method: 'GET',
            },
            {
              module: `collection_${collection.name}`,
              endpoint: `/api/public/collections/${collection.name}/:id`,
              method: 'GET',
            },
          ];

          // For full_access, add write operations
          if (type === 'full_access') {
            collectionEndpoints.push(
              {
                module: `collection_${collection.name}`,
                endpoint: `/api/public/collections/${collection.name}`,
                method: 'POST',
              },
              {
                module: `collection_${collection.name}`,
                endpoint: `/api/public/collections/${collection.name}/:id`,
                method: 'PUT',
              },
              {
                module: `collection_${collection.name}`,
                endpoint: `/api/public/collections/${collection.name}/:id`,
                method: 'PATCH',
              },
              {
                module: `collection_${collection.name}`,
                endpoint: `/api/public/collections/${collection.name}/:id`,
                method: 'DELETE',
              }
            );
          }

          endpointsToCreate.push(...collectionEndpoints);
        }

        // Add single type endpoints
        for (const single of singleTypes) {
          const singleEndpoints = [
            {
              module: `single_${single.name}`,
              endpoint: `/api/public/singles/${single.name}`,
              method: 'GET',
            },
          ];

          // For full_access, add write operations
          if (type === 'full_access') {
            singleEndpoints.push({
              module: `single_${single.name}`,
              endpoint: `/api/public/singles/${single.name}`,
              method: 'PUT',
            });
          }

          endpointsToCreate.push(...singleEndpoints);
        }

        // Add media endpoints
        const mediaEndpoints = [
          {
            module: 'media',
            endpoint: '/api/public/media',
            method: 'GET',
          },
          {
            module: 'media',
            endpoint: '/api/public/media/:id',
            method: 'GET',
          },
        ];

        if (type === 'full_access') {
          mediaEndpoints.push(
            {
              module: 'media',
              endpoint: '/api/public/media/upload',
              method: 'POST',
            },
            {
              module: 'media',
              endpoint: '/api/public/media/:id',
              method: 'PUT',
            },
            {
              module: 'media',
              endpoint: '/api/public/media/:id',
              method: 'DELETE',
            }
          );
        }

        endpointsToCreate.push(...mediaEndpoints);
      } else if (type === 'custom') {
        // For custom tokens, use the provided endpoints
        if (!endpoints || endpoints.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Custom tokens require at least one endpoint permission',
          });
        }
        endpointsToCreate = endpoints;
      }

      console.log('[API Tokens] Total endpoints to create:', endpointsToCreate.length);

      // Prepare the data for token creation
      const tokenData: any = {
        name,
        description,
        token,
        type,
        expiresAt,
        createdById: userId,
      };

      // Only add endpoints if we have any to create
      if (endpointsToCreate && endpointsToCreate.length > 0) {
        tokenData.endpoints = {
          create: endpointsToCreate.map((ep: any) => ({
            module: ep.module || '',
            endpoint: ep.endpoint || '',
            method: ep.method || 'GET',
          })),
        };
      }

      console.log('[API Tokens] Creating token with', endpointsToCreate.length, 'endpoints');

      // Create token without deactivating others (allow multiple active tokens)
      const apiToken = await prisma.apiToken.create({
        data: tokenData,
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
