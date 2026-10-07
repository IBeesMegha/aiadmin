import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid single type name' });
  }

  try {
    if (req.method === 'GET') {
      const singleType = await prisma.singleType.findUnique({
        where: { name },
      });

      if (!singleType) {
        return res.status(404).json({ error: 'Single type not found' });
      }

      if (req.query.includeMeta === 'true') {
        return res.status(200).json({ data: singleType });
      }

      return res.status(200).json({ data: singleType.data });
    }

    if (req.method === 'PUT') {
      // Update single type (structure or data)
      const { displayName, description, fields, data } = req.body;

      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (fields !== undefined) updateData.fields = fields;
      if (data !== undefined) updateData.data = data;

      const singleType = await prisma.singleType.update({
        where: { name },
        data: updateData,
      });

      return res.status(200).json({ data: singleType });
    }

    if (req.method === 'DELETE') {
      await prisma.singleType.delete({
        where: { name },
      });

      return res.status(200).json({ message: 'Single type deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Single Type API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
