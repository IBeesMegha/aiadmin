export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Languages API Route (Internationalization)
 * GET /api/languages - List all languages, syncing the centralized catalog
 *
 * The centralized catalog (lib/i18n/languages.ts) defines which languages exist.
 * The Prisma `Language` model stores per-language state (isActive/isDefault).
 * Syncing only ever *creates* missing languages as inactive; it never deletes
 * or deactivates existing languages, so content is never affected.
 */

import type { NextApiResponse } from 'next';

import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { prisma } from '@/lib/prisma';
import { WORLD_LANGUAGES, DEFAULT_LANGUAGE_CODE } from '@/lib/i18n/languages';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    await syncLanguageCatalog();

    const languages = await prisma.language.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return res.status(200).json({
      success: true,
      data: { languages },
    });
  } catch (error: any) {
    console.error('Get languages error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch languages',
    });
  }
}

/**
 * Ensure every language in the centralized catalog exists in the database.
 * New languages are created inactive (except the default), and existing
 * languages are left untouched so admin toggles are never overwritten.
 */
async function syncLanguageCatalog() {
  const existing = await prisma.language.findMany({
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((language) => language.code));

  const missing = WORLD_LANGUAGES.filter((language) => !existingCodes.has(language.code));

  if (missing.length > 0) {
    await prisma.language.createMany({
      data: missing.map((language) => ({
        code: language.code,
        name: language.name,
        nativeName: language.nativeName,
        flag: language.flag,
        isDefault: language.code === DEFAULT_LANGUAGE_CODE,
        isActive: language.code === DEFAULT_LANGUAGE_CODE,
      })),
      skipDuplicates: true,
    });
  }

  // Guarantee the default language is present and correctly flagged.
  await prisma.language.upsert({
    where: { code: DEFAULT_LANGUAGE_CODE },
    update: {},
    create: {
      code: DEFAULT_LANGUAGE_CODE,
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      isDefault: true,
      isActive: true,
    },
  });
}

export default function languagesRoute(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return requirePermission('internationalization.read')(req, res, handler);
  }
  return handler(req, res);
}
