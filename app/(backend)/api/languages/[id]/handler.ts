export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Language API Route (Internationalization)
 * PATCH /api/languages/[id] - Activate or deactivate a language
 *
 * Deactivation only flips the `isActive` flag. It never deletes the language
 * or any content associated with it. The default language cannot be
 * deactivated. Deleting languages is intentionally not supported yet.
 */

import type { NextApiResponse } from 'next';

import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { prisma } from '@/lib/prisma';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PATCH') {
    return handlePatch(req, res);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const id = req.query.id as string;
    const language = await prisma.language.findUnique({ where: { id } });

    if (!language) {
      return res.status(404).json({
        success: false,
        error: 'Language not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { language },
    });
  } catch (error: any) {
    console.error('Get language error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch language',
    });
  }
}

async function handlePatch(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const id = req.query.id as string;
    const { isActive } = req.body ?? {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: '`isActive` must be a boolean',
      });
    }

    const language = await prisma.language.findUnique({ where: { id } });

    if (!language) {
      return res.status(404).json({
        success: false,
        error: 'Language not found',
      });
    }

    if (language.isDefault && isActive === false) {
      return res.status(400).json({
        success: false,
        error: 'The default language cannot be deactivated',
      });
    }

    // Only the active flag changes. Content is never removed on deactivation.
    const updated = await prisma.language.update({
      where: { id },
      data: { isActive },
    });

    return res.status(200).json({
      success: true,
      data: { language: updated },
      message: isActive ? 'Language activated' : 'Language deactivated',
    });
  } catch (error: any) {
    console.error('Update language error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update language',
    });
  }
}

export default function languageRoute(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return requirePermission('internationalization.read')(req, res, handler);
  } else if (req.method === 'PATCH') {
    return requirePermission('internationalization.manage')(req, res, handler);
  }
  return handler(req, res);
}
