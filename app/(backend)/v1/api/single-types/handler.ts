export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(req: ApiTokenRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { page = '1', limit = '50' } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      const singleTypes = await prisma.singleType.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum,
      });

      const totalItems = await prisma.singleType.count();

      const data = singleTypes.map((singleType) => ({
        id: singleType.id,
        name: singleType.name,
        displayName: singleType.displayName,
        description: singleType.description,
        fieldCount: ((singleType.fields as any)?.fields || []).length,
        updatedAt: singleType.updatedAt,
      }));

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
        },
      });
    }

    if (req.method === 'POST') {
      const { name, displayName, description, fields } = req.body || {};

      if (!name || !displayName || !fields) {
        return res.status(400).json({
          success: false,
          error: 'name, displayName and fields are required',
        });
      }

      const normalizedName = String(name).toLowerCase().replace(/\s+/g, '-');

      const existing = await prisma.singleType.findUnique({
        where: { name: normalizedName },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Single type "${normalizedName}" already exists`,
        });
      }

      const singleType = await prisma.singleType.create({
        data: {
          name: normalizedName,
          displayName,
          description,
          fields,
          data: {},
        },
      });

      return res.status(201).json({
        success: true,
        data: singleType,
        message: 'Single type created',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('V1 Single Types API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
