export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(req: ApiTokenRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { page = '1', limit = '20' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const collectionTypes = await prisma.collectionType.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum,
      });

      const countResult: any = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "CollectionType"`,
      );
      const totalItems = countResult[0]?.count || 0;

      return res.status(200).json({
        success: true,
        data: collectionTypes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
        },
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('V1 Collections API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
