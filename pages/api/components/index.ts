import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    if (req.method === 'GET') {
      // Get all components
      const components = await prisma.component.findMany({
        orderBy: { category: 'asc' },
      });
      return res.status(200).json({ data: components });
    }

    if (req.method === 'POST') {
      // Create new component
      const { name, displayName, category, fields } = req.body;

      if (!name || !displayName || !category || !fields) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const component = await prisma.component.create({
        data: {
          name: name.toLowerCase().replace(/\s+/g, '-'),
          displayName,
          category,
          fields,
        },
      });

      return res.status(201).json({ data: component });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Components API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
