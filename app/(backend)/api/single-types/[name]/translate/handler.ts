export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

import { ApiResponse } from '@/lib/types';

import {
  createSingleTypeTranslation,
  getSingleTypeSnapshot,
  resolveSingleTypeLocale,
  SingleTypeStorageError,
} from '@/lib/single-type-service';

function sendError(res: NextApiResponse<ApiResponse>, error: any) {
  if (error instanceof SingleTypeStorageError || error?.statusCode) {
    return res.status(error.statusCode || 500).json({
      error: error.message,
      code: error.code,
    });
  }

  console.error('Single Type Translation API Error:', error);
  return res.status(500).json({
    error: error.message || 'Internal server error',
  });
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid single type name' });
  }

  try {
    const singleType = await prisma.singleType.findUnique({
      where: { name },
    });

    if (!singleType) {
      return res.status(404).json({ error: 'Single type not found' });
    }

    const rawLocale =
      (req.body?.locale as string | undefined) ??
      (req.query.locale as string | undefined);
    const locale = await resolveSingleTypeLocale(rawLocale);

    if (!rawLocale) {
      throw new SingleTypeStorageError(
        400,
        'LOCALE_REQUIRED',
        'A target language code is required'
      );
    }

    await createSingleTypeTranslation(
      singleType,
      locale,
      (req.body?.data as Record<string, any>) || {}
    );

    const snapshot = await getSingleTypeSnapshot(singleType, locale, {
      fallbackToDefault: false,
    });

    const refreshed = await prisma.singleType.findUnique({
      where: { id: singleType.id },
    });

    return res.status(201).json({
      data: {
        ...(refreshed || singleType),
        tableName: snapshot.tableName,
        data: snapshot.data,
        locale: snapshot.locale,
        availableLocales: snapshot.availableLocales,
      },
      message: 'Translation created',
    });
  } catch (error: any) {
    return sendError(res, error);
  }
}

export default authMiddleware(handler);
