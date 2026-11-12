export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

import { ApiResponse } from '@/lib/types';

import {
  createSingleTypeDefinition,
  SingleTypeStorageError,
} from '@/lib/single-type-service';

function sendError(res: NextApiResponse<ApiResponse>, error: any) {
  if (error instanceof SingleTypeStorageError || error?.statusCode) {
    return res.status(error.statusCode || 500).json({
      error: error.message,
      code: error.code,
    });
  }

  console.error('Single Types API Error:', error);
  return res.status(500).json({
    error: error.message || 'Internal server error',
  });
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    if (req.method === 'GET') {
      const singleTypes = await prisma.singleType.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ data: singleTypes });
    }

    if (req.method === 'POST') {
      const { name, displayName, description, fields, data } = req.body || {};

      if (!name || !displayName || !fields) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const singleType = await createSingleTypeDefinition({
        name,
        displayName,
        description,
        fields,
        initialData: data,
      });

      return res.status(201).json({
        data: singleType,
        message: 'Single type created successfully',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return sendError(res, error);
  }
}

export default authMiddleware(handler);
