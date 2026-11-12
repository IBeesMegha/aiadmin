export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';
import {
  deleteSingleTypeDefinition,
  getSingleTypeSnapshot,
  resolveSingleTypeLocale,
  SingleTypeStorageError,
  updateSingleTypeContent,
  updateSingleTypeDefinition,
} from '@/lib/single-type-service';

function sendError(res: NextApiResponse, error: any) {
  if (error instanceof SingleTypeStorageError || error?.statusCode) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }

  console.error('V1 Single Type API Error:', error);
  return res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
}

async function handler(req: ApiTokenRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Single type name is required' });
  }

  try {
    const singleType = await prisma.singleType.findUnique({
      where: { name },
    });

    if (!singleType) {
      return res.status(404).json({ success: false, error: `Single type "${name}" not found` });
    }

    if (req.method === 'GET') {
      const requestedLocale = await resolveSingleTypeLocale(
        req.query.locale as string | undefined
      );
      const snapshot = await getSingleTypeSnapshot(singleType, requestedLocale, {
        fallbackToDefault: true,
      });

      if (req.query.includeMeta === 'true') {
        return res.status(200).json({
          success: true,
          data: {
            ...singleType,
            tableName: snapshot.tableName,
            data: snapshot.data,
            locale: snapshot.locale,
            availableLocales: snapshot.availableLocales,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: snapshot.data ?? {},
        meta: {
          name: singleType.name,
          displayName: singleType.displayName,
          description: singleType.description,
          locale: snapshot.locale,
          requestedLocale: snapshot.requestedLocale,
          availableLocales: snapshot.availableLocales,
        },
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { displayName, description, fields, data } = req.body || {};
      const locale = await resolveSingleTypeLocale(
        (req.body?.locale as string | undefined) ??
          (req.query.locale as string | undefined)
      );

      const hasStructureUpdate =
        displayName !== undefined ||
        description !== undefined ||
        fields !== undefined;

      if (!hasStructureUpdate && data === undefined) {
        return res.status(400).json({ success: false, error: 'Nothing to update' });
      }

      const updated = await updateSingleTypeDefinition(singleType, {
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
        success: true,
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
      await deleteSingleTypeDefinition(singleType);

      return res.status(200).json({
        success: true,
        message: 'Single type deleted',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    return sendError(res, error);
  }
}

export default withApiToken(handler);
