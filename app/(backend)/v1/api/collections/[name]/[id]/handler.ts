export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(req: ApiTokenRequest, res: NextApiResponse) {
  try {
    const { name, id } = req.query;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }

    if (!id) {
      return res.status(400).json({ success: false, error: 'Entry ID is required' });
    }

    const sanitizedTableName = (name as string).toLowerCase().replace(/-/g, '_');

    const collectionType = await prisma.collectionType.findUnique({
      where: { name: sanitizedTableName },
    });

    if (!collectionType) {
      return res.status(404).json({ success: false, error: `Collection "${name}" not found` });
    }

    if (req.method === 'GET') {
      const result: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${sanitizedTableName}" WHERE id = $1`,
        id as string,
      );

      if (!result || result.length === 0) {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }

      return res.status(200).json({
        success: true,
        data: result[0],
        collectionType: {
          id: collectionType.id,
          name: collectionType.name,
          displayName: collectionType.displayName,
        },
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const data = req.body;

      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ success: false, error: 'Request body is required' });
      }

      const existing: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${sanitizedTableName}" WHERE id = $1`,
        id as string,
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }

      const { updatedAt, ...dataWithoutUpdatedAt } = data;
      const columns = Object.keys(dataWithoutUpdatedAt);
      const values = Object.values(dataWithoutUpdatedAt);

      const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');

      const query = `UPDATE "${sanitizedTableName}" SET ${setClause}, "updatedAt" = NOW() WHERE id = $${values.length + 1} RETURNING *`;

      const result: any = await prisma.$queryRawUnsafe(query, ...values, id as string);

      return res.status(200).json({
        success: true,
        data: result[0],
        message: 'Entry updated successfully',
      });
    }

    if (req.method === 'DELETE') {
      const existing: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${sanitizedTableName}" WHERE id = $1`,
        id as string,
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }

      const result: any = await prisma.$queryRawUnsafe(
        `DELETE FROM "${sanitizedTableName}" WHERE id = $1 RETURNING *`,
        id as string,
      );

      return res.status(200).json({
        success: true,
        data: result[0],
        message: 'Entry deleted successfully',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('V1 Collection [id] API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
