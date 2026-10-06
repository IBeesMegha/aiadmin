/**
 * Get Available API Endpoints for API Token Permissions
 * GET /api/api-tokens/endpoints
 * 
 * Returns all public API endpoints grouped by module
 * Dynamically loads Collection Types and Single Types from database
 * Admin APIs are NOT included
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getAccessToken } from '@/lib/auth/cookies';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify admin authentication (JWT only)
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

    if (req.method === 'GET') {
      // Fetch all collection types from database
      const collectionTypes = await prisma.collectionType.findMany({
        select: {
          name: true,
          displayName: true,
        },
        orderBy: {
          displayName: 'asc',
        },
      });

      // Fetch all single types from database
      const singleTypes = await prisma.singleType.findMany({
        select: {
          name: true,
          displayName: true,
        },
        distinct: ['name'],
        orderBy: {
          displayName: 'asc',
        },
      });

      // Build modules with endpoints
      const modules = [];

      // Add collection types as modules
      for (const collection of collectionTypes) {
        modules.push({
          module: `collection_${collection.name}`,
          displayName: collection.displayName,
          endpoints: [
            {
              endpoint: `/api/public/collections/${collection.name}`,
              method: 'GET',
              description: `List all ${collection.displayName} entries`,
              module: `collection_${collection.name}`,
            },
            {
              endpoint: `/api/public/collections/${collection.name}/:id`,
              method: 'GET',
              description: `Get single ${collection.displayName} entry`,
              module: `collection_${collection.name}`,
            },
            {
              endpoint: `/api/public/collections/${collection.name}`,
              method: 'POST',
              description: `Create ${collection.displayName} entry`,
              module: `collection_${collection.name}`,
            },
            {
              endpoint: `/api/public/collections/${collection.name}/:id`,
              method: 'PUT',
              description: `Update ${collection.displayName} entry`,
              module: `collection_${collection.name}`,
            },
            {
              endpoint: `/api/public/collections/${collection.name}/:id`,
              method: 'PATCH',
              description: `Partially update ${collection.displayName} entry`,
              module: `collection_${collection.name}`,
            },
            {
              endpoint: `/api/public/collections/${collection.name}/:id`,
              method: 'DELETE',
              description: `Delete ${collection.displayName} entry`,
              module: `collection_${collection.name}`,
            },
          ],
        });
      }

      // Add single types as modules
      for (const single of singleTypes) {
        modules.push({
          module: `single_${single.name}`,
          displayName: single.displayName,
          endpoints: [
            {
              endpoint: `/api/public/singles/${single.name}`,
              method: 'GET',
              description: `Get ${single.displayName} data`,
              module: `single_${single.name}`,
            },
            {
              endpoint: `/api/public/singles/${single.name}`,
              method: 'PUT',
              description: `Update ${single.displayName} data`,
              module: `single_${single.name}`,
            },
          ],
        });
      }

      // Add Media Library module (system module)
      modules.push({
        module: 'media',
        displayName: 'Media Library',
        endpoints: [
          {
            endpoint: '/api/public/media',
            method: 'GET',
            description: 'List all media files',
            module: 'media',
          },
          {
            endpoint: '/api/public/media/:id',
            method: 'GET',
            description: 'Get single media file',
            module: 'media',
          },
          {
            endpoint: '/api/public/media/upload',
            method: 'POST',
            description: 'Upload media file',
            module: 'media',
          },
          {
            endpoint: '/api/public/media/:id',
            method: 'PUT',
            description: 'Update media metadata',
            module: 'media',
          },
          {
            endpoint: '/api/public/media/:id',
            method: 'DELETE',
            description: 'Delete media file',
            module: 'media',
          },
        ],
      });

      // Calculate total endpoints
      const totalEndpoints = modules.reduce(
        (sum, module) => sum + module.endpoints.length,
        0
      );

      return res.status(200).json({
        success: true,
        data: {
          modules,
          totalEndpoints,
        },
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error: any) {
    console.error('Endpoints API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
