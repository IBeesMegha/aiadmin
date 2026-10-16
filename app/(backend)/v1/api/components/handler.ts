export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(req: ApiTokenRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { page = '1', limit = '50', category } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      const where: any = category ? { category: category as string } : {};

      const components = await prisma.component.findMany({
        where,
        orderBy: { category: 'asc' },
        skip: offset,
        take: limitNum,
      });

      const totalItems = await prisma.component.count({ where });

      const data = components.map((component) => ({
        id: component.id,
        name: component.name,
        displayName: component.displayName,
        category: component.category,
        fieldCount: ((component.fields as any)?.fields || []).length,
        updatedAt: component.updatedAt,
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
      const { name, displayName, category, fields } = req.body || {};

      if (!name || !displayName || !category || !fields) {
        return res.status(400).json({
          success: false,
          error: 'name, displayName, category and fields are required',
        });
      }

      const normalizedName = String(name).toLowerCase().replace(/\s+/g, '-');

      const existing = await prisma.component.findUnique({
        where: { name: normalizedName },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Component "${normalizedName}" already exists`,
        });
      }

      const component = await prisma.component.create({
        data: {
          name: normalizedName,
          displayName,
          category,
          fields,
        },
      });

      return res.status(201).json({
        success: true,
        data: component,
        message: 'Component created',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('V1 Components API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
