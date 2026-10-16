export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(req: ApiTokenRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Component name is required' });
  }

  try {
    const component = await prisma.component.findUnique({
      where: { name },
    });

    if (!component) {
      return res.status(404).json({ success: false, error: `Component "${name}" not found` });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ success: true, data: component });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { displayName, category, fields } = req.body || {};

      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (category !== undefined) updateData.category = category;
      if (fields !== undefined) updateData.fields = fields;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: 'Nothing to update' });
      }

      const updated = await prisma.component.update({
        where: { name },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Component updated',
      });
    }

    if (req.method === 'DELETE') {
      // ComponentEntry has onDelete: Cascade, so existing entries are removed
      // along with the component (same behaviour as the admin API).
      await prisma.component.delete({ where: { name } });

      return res.status(200).json({
        success: true,
        message: 'Component deleted',
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('V1 Component API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default withApiToken(handler);
