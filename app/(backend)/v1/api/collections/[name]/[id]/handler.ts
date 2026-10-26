export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';
import { resolveRequestLocale } from '@/lib/content-i18n';
import { populateRelations } from '@/lib/relation-populate';
import { populateComponents } from '@/lib/component-populate';

async function handler(req: ApiTokenRequest, res: NextApiResponse) {
  try {
    const { name, id } = req.query;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }

    if (!id) {
      return res.status(400).json({ success: false, error: 'Entry ID (rootId) is required' });
    }

    const sanitizedTableName = (name as string).toLowerCase().replace(/-/g, '_');
    const rootId = id as string;

    const collectionType = await prisma.collectionType.findUnique({
      where: { name: sanitizedTableName },
    });

    if (!collectionType) {
      return res.status(404).json({ success: false, error: `Collection "${name}" not found` });
    }

    const fields = (collectionType.fields as any)?.fields || [];

    if (req.method === 'GET') {
      const locale = await resolveRequestLocale(req.query);
      const defaultLocale = 'en';

      // Look up by rootId + requested locale. Fall back to default locale when
      // the requested translation does not exist, then 404 if neither exists.
      let target: any = null;
      let resolvedLocale = locale;

      const rows: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${sanitizedTableName}" WHERE "rootId" = $1 AND "locale" = $2`,
        rootId,
        locale,
      );
      const found = Array.isArray(rows) ? rows[0] : rows;

      if (found) {
        target = found;
        resolvedLocale = locale;
      } else if (locale !== defaultLocale) {
        const fallbackRows: any = await prisma.$queryRawUnsafe(
          `SELECT * FROM "${sanitizedTableName}" WHERE "rootId" = $1 AND "locale" = $2`,
          rootId,
          defaultLocale,
        );
        const fallback = Array.isArray(fallbackRows) ? fallbackRows[0] : fallbackRows;
        if (fallback) {
          target = fallback;
          resolvedLocale = defaultLocale;
        }
      }

      if (!target) {
        return res.status(404).json({
          success: false,
          error: `Entry not found in locale "${locale}"`,
        });
      }

      const resolved = await populateRelations(
        { ...target },
        sanitizedTableName,
        fields,
      );
      const populated =
        req.query.populate === 'true'
          ? await populateComponents(resolved, fields)
          : resolved;

      // Never expose the per-locale primary key as the public API id.
      const { id: _pk, ...publicEntry } = populated;

      return res.status(200).json({
        success: true,
        data: publicEntry,
        rootId,
        locale: resolvedLocale,
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const data = req.body;

      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ success: false, error: 'Request body is required' });
      }

      const locale = await resolveRequestLocale(req.query);

      // Locate the specific locale row by rootId + locale (never by per-locale pk).
      const existing: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${sanitizedTableName}" WHERE "rootId" = $1 AND "locale" = $2`,
        rootId,
        locale,
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }

      const localeId = existing[0].id;
      const { updatedAt, ...dataWithoutUpdatedAt } = data;
      const columns = Object.keys(dataWithoutUpdatedAt);
      const values = Object.values(dataWithoutUpdatedAt);

      const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');

      const query = `UPDATE "${sanitizedTableName}" SET ${setClause}, "updatedAt" = NOW() WHERE id = $${values.length + 1} RETURNING *`;

      const result: any = await prisma.$queryRawUnsafe(query, ...values, localeId);

      return res.status(200).json({
        success: true,
        data: result[0],
        message: 'Entry updated successfully',
      });
    }

    if (req.method === 'DELETE') {
      const locale = await resolveRequestLocale(req.query);

      const existing: any = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${sanitizedTableName}" WHERE "rootId" = $1 AND "locale" = $2`,
        rootId,
        locale,
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }

      const localeId = existing[0].id;

      const result: any = await prisma.$queryRawUnsafe(
        `DELETE FROM "${sanitizedTableName}" WHERE id = $1 RETURNING *`,
        localeId,
      );

      return res.status(200).json({
        success: true,
        data: result[0],
        message: 'Entry deleted successfully',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('V1 Collection [id] API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
