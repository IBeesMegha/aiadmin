export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

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
      // Default: return the content data only, so frontend consumers do not
      // receive the schema. Use ?includeMeta=true to get the full record.
      if (req.query.includeMeta === 'true') {
        return res.status(200).json({ success: true, data: singleType });
      }

      return res.status(200).json({
        success: true,
        data: singleType.data ?? {},
        meta: {
          name: singleType.name,
          displayName: singleType.displayName,
          description: singleType.description,
        },
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { displayName, description, fields, data } = req.body || {};

      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (fields !== undefined) updateData.fields = fields;
      if (data !== undefined) updateData.data = data;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: 'Nothing to update' });
      }

      const updated = await prisma.singleType.update({
        where: { name },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Single type updated',
      });
    }

    if (req.method === 'DELETE') {
      await prisma.singleType.delete({ where: { name } });

      return res.status(200).json({
        success: true,
        message: 'Single type deleted',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('V1 Single Type API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
