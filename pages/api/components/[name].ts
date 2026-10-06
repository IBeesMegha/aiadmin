import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid component name' });
  }

  try {
    if (req.method === 'GET') {
      // Get specific component
      const component = await prisma.component.findUnique({
        where: { name },
      });

      if (!component) {
        return res.status(404).json({ error: 'Component not found' });
      }

      return res.status(200).json({ data: component });
    }

    if (req.method === 'PUT') {
      // Update component
      const { displayName, category, fields } = req.body;

      const component = await prisma.component.update({
        where: { name },
        data: {
          displayName,
          category,
          fields,
        },
      });

      return res.status(200).json({ data: component });
    }

    if (req.method === 'DELETE') {
      // Delete component
      await prisma.component.delete({
        where: { name },
      });

      return res.status(200).json({ message: 'Component deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Component API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
