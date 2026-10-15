export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middlewares/api/auth-middleware';
import { findManyDynamic, findUniqueDynamic } from '@/lib/dynamic-prisma';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { name, page = '1', limit = '20', sort, order, ...filters } = req.query;

      if (name) {
        const sanitizedTableName = (name as string).toLowerCase().replace(/-/g, '_');

        const collectionType = await prisma.collectionType.findUnique({
          where: { name: sanitizedTableName },
        });

        if (!collectionType) {
          return res.status(404).json({ success: false, error: `Collection "${name}" not found` });
        }

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        let orderBy = '"createdAt" DESC';
        if (sort) {
          const sortField = (sort as string).replace(/[^a-zA-Z0-9_]/g, '');
          const sortOrder = (order as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
          orderBy = `"${sortField}" ${sortOrder}`;
        }

        const countResult: any = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM "${sanitizedTableName}"`,
        );
        const totalItems = countResult[0]?.count || 0;

        const entries: any = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${sanitizedTableName}" ORDER BY ${orderBy} LIMIT ${limitNum} OFFSET ${offset}`,
        );

        return res.status(200).json({
          success: true,
          data: entries,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalItems,
            totalPages: Math.ceil(totalItems / limitNum),
          },
          collectionType: {
            id: collectionType.id,
            name: collectionType.name,
            displayName: collectionType.displayName,
          },
        });
      }

      const collectionTypes = await prisma.collectionType.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: collectionTypes });
    }

    if (req.method === 'POST') {
      const { name, displayName, description, fields } = req.body;

      if (!name || !displayName || !fields) {
        return res.status(400).json({ success: false, error: 'Missing required fields: name, displayName, fields' });
      }

      const normalizedName = name.toLowerCase().replace(/\s+/g, '-');

      const existing = await prisma.collectionType.findUnique({
        where: { name: normalizedName },
      });

      if (existing) {
        return res.status(400).json({ success: false, error: `Collection "${name}" already exists` });
      }

      const nonRelationFields = (fields.fields || []).filter((f: any) => f.type !== 'relation');

      const collectionType = await prisma.collectionType.create({
        data: {
          name: normalizedName,
          displayName,
          description,
          fields: { fields: nonRelationFields },
        },
      });

      const { createDynamicTable, syncTableSchema } = await import('@/lib/dynamic-table-service');
      const { syncInverseRelations } = await import('@/lib/relation-metadata');
      const { syncRelatedCollections } = await import('@/lib/relation-sync');

      await createDynamicTable(normalizedName, nonRelationFields);

      const relationFields = (fields.fields || []).filter((f: any) => f.type === 'relation');

      if (relationFields.length > 0) {
        const { fields: syncedFields, affectedCollections } = await syncInverseRelations(
          normalizedName,
          [],
          fields.fields || [],
        );

        await prisma.collectionType.update({
          where: { name: normalizedName },
          data: { fields: { fields: syncedFields } as any },
        });

        await syncTableSchema(normalizedName, syncedFields);
        await syncRelatedCollections(affectedCollections);
      }

      const updatedCollection = await prisma.collectionType.findUnique({
        where: { id: collectionType.id },
      });

      return res.status(201).json({
        success: true,
        data: updatedCollection,
        message: 'Collection created successfully',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Collections API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default function(req: any, res: NextApiResponse) {
  return withAuth(req, res, handler as any);
}
