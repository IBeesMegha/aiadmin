export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/types';
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';
import {
  createTranslation,
  listTranslations,
  ContentI18nError,
} from '@/lib/content-i18n';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { name, id } = req.query;

  if (typeof name !== 'string' || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const collectionType = await prisma.collectionType.findUnique({
      where: { name },
    });

    if (!collectionType) {
      return res.status(404).json({ error: 'Collection type not found' });
    }

    if (req.method === 'GET') {
      const { rootId, translations } = await listTranslations(name, id);
      return res.status(200).json({ data: translations, rootId } as any);
    }

    if (req.method === 'POST') {
      const { locale, data } = req.body || {};

      const created = await createTranslation(name, id, locale, data || {});
      return res.status(201).json({ data: created });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    if (error instanceof ContentI18nError || typeof error?.statusCode === 'number') {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Translation API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export default authMiddleware(handler);
