export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(req: ApiTokenRequest, res: NextApiResponse) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }

    const sanitizedTableName = (name as string).toLowerCase().replace(/-/g, '_');

    const collectionType = await prisma.collectionType.findUnique({
      where: { name: sanitizedTableName },
    });

    if (!collectionType) {
      return res.status(404).json({ success: false, error: `Collection "${name}" not found` });
    }

    if (req.method === 'GET') {
      const { page = '1', limit = '20', sort, order } = req.query;

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

    if (req.method === 'POST') {
      const data = req.body;

      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ success: false, error: 'Request body is required' });
      }

      const { createDynamicTable, tableExists, syncTableSchema } = await import('@/lib/dynamic-table-service');

      const dataWithDefaults: Record<string, any> = {
        id: data.id || `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`,
        ...data,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
      };

      const columns = Object.keys(dataWithDefaults);
      const values = Object.values(dataWithDefaults);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      const query = `INSERT INTO "${sanitizedTableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) RETURNING *`;

      const result: any = await prisma.$queryRawUnsafe(query, ...values);

      return res.status(201).json({
        success: true,
        data: result[0],
        message: 'Entry created successfully',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('V1 Collection [name] API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
