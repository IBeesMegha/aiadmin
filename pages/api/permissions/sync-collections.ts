/**
 * Sync Collection Permissions API
 * POST /api/permissions/sync-collections
 * Automatically creates permissions for all collection types
 */

import type { NextApiResponse } from 'next';
import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { prisma } from '@/lib/prisma';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Get all collection types
    const collectionTypes = await prisma.collectionType.findMany();
    
    // Get all single types
    const singleTypes = await prisma.singleType.findMany();

    const created: string[] = [];
    const skipped: string[] = [];

    // Define permission actions for collections
    const collectionActions = ['create', 'read', 'update', 'delete', 'publish'];
    
    // Create permissions for collection types
    for (const ct of collectionTypes) {
      const module = ct.name;
      
      for (const action of collectionActions) {
        const slug = `${module}.${action}`;
        
        // Check if permission already exists
        const exists = await prisma.permission.findUnique({
          where: { slug },
        });

        if (!exists) {
          await prisma.permission.create({
            data: {
              name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${ct.displayName}`,
              slug,
              module,
              description: `${action} permission for ${ct.displayName} collection`,
            },
          });
          created.push(slug);
        } else {
          skipped.push(slug);
        }
      }
    }

    // Create permissions for single types
    for (const st of singleTypes) {
      const module = st.name;
      
      // Single types typically only need read and update
      const singleTypeActions = ['read', 'update'];
      
      for (const action of singleTypeActions) {
        const slug = `${module}.${action}`;
        
        const exists = await prisma.permission.findUnique({
          where: { slug },
        });

        if (!exists) {
          await prisma.permission.create({
            data: {
              name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${st.displayName}`,
              slug,
              module,
              description: `${action} permission for ${st.displayName} single type`,
            },
          });
          created.push(slug);
        } else {
          skipped.push(slug);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synced permissions: ${created.length} created, ${skipped.length} skipped`,
      data: {
        created,
        skipped,
      },
    });
  } catch (error: any) {
    console.error('Sync permissions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync permissions',
    });
  }
}

export default function (req: any, res: NextApiResponse) {
  return requirePermission('permissions.create')(req, res, handler);
}
