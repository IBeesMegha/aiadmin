export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

import { ApiResponse } from '@/lib/types';

import {
  deleteSingleTypeDefinition,
  getSingleTypeSnapshot,
  resolveSingleTypeLocale,
  SingleTypeStorageError,
  updateSingleTypeContent,
  updateSingleTypeDefinition,
} from '@/lib/single-type-service';

function sendError(res: NextApiResponse<ApiResponse>, error: any) {
  if (error instanceof SingleTypeStorageError || error?.statusCode) {
    return res.status(error.statusCode || 500).json({
      error: error.message,
      code: error.code,
    });
  }

  console.error('Single Type API Error:', error);
  return res.status(500).json({
    error: error.message || 'Internal server error',
  });
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid single type name' });
  }

  try {
    const existing = await prisma.singleType.findUnique({
      where: { name },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Single type not found' });
    }

    if (req.method === 'GET') {
      const locale = await resolveSingleTypeLocale(
        (req.query.locale as string | undefined) ?? undefined
      );
      const snapshot = await getSingleTypeSnapshot(existing, locale, {
        fallbackToDefault: false,
      });

      if (req.query.includeMeta === 'true') {
        return res.status(200).json({
          data: {
            ...existing,
            tableName: snapshot.tableName,
            data: snapshot.data,
            locale: snapshot.locale,
            availableLocales: snapshot.availableLocales,
          },
        });
      }

      return res.status(200).json({
        data: snapshot.data,
        meta: {
          locale: snapshot.locale,
          availableLocales: snapshot.availableLocales,
        },
      });
    }

    if (req.method === 'PUT') {
      const { displayName, description, fields, data } = req.body || {};
      const locale = await resolveSingleTypeLocale(
        (req.body?.locale as string | undefined) ??
          (req.query.locale as string | undefined) ??
          undefined
      );

      const updated = await updateSingleTypeDefinition(existing, {
        displayName,
        description,
        fields,
      });

      if (data !== undefined) {
        await updateSingleTypeContent(updated, locale, data);
      }

      const snapshot = await getSingleTypeSnapshot(updated, locale, {
        fallbackToDefault: false,
      });

      return res.status(200).json({
        data: {
          ...updated,
          tableName: snapshot.tableName,
          data: snapshot.data,
          locale: snapshot.locale,
          availableLocales: snapshot.availableLocales,
        },
        message: 'Single type updated',
      });
    }

    if (req.method === 'DELETE') {
      await deleteSingleTypeDefinition(existing);
      return res.status(200).json({ message: 'Single type deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return sendError(res, error);
  }
}

export default authMiddleware(handler);
