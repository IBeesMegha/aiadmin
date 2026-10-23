export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';
import { resolveRequestLocale } from '@/lib/content-i18n';

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

      const locale = await resolveRequestLocale(req.query);
      const localeFilter = ` WHERE "locale" = '${locale}'`;

      let orderBy = '"createdAt" DESC';
      if (sort) {
        const sortField = (sort as string).replace(/[^a-zA-Z0-9_]/g, '');
        const sortOrder = (order as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        orderBy = `"${sortField}" ${sortOrder}`;
      }

      const countResult: any = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "${sanitizedTableName}"${localeFilter}`,
      );
      const totalItems = countResult[0]?.count || 0;

      const entries: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${sanitizedTableName}"${localeFilter} ORDER BY ${orderBy} LIMIT ${limitNum} OFFSET ${offset}`,
      );

      return res.status(200).json({
        success: true,
        data: entries,
        locale,
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

      const { createDynamic } = await import('@/lib/dynamic-prisma');

      // IMPORTANT: Never allow client to set the 'id' directly
      // Always generate a new unique ID for new entries (including translations)
      const { id: clientId, ...dataWithoutId } = data;

      const dataWithDefaults: Record<string, any> = {
        ...dataWithoutId,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
      };

      // If rootId is provided, this is a translation (allow it via i18n flag)
      // If rootId is not provided, createDynamic will set rootId = id automatically
      const isTranslation = !!dataWithDefaults.rootId;
      
      const result = await createDynamic(
        sanitizedTableName, 
        dataWithDefaults,
        { allowReservedI18n: isTranslation }
      );

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Entry created successfully',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('V1 Collection [name] API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
