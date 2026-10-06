/**
 * Component Entry API (Single)
 * 
 * GET /api/component-entries/[id] - Get a component entry
 * PUT /api/component-entries/[id] - Update a component entry
 * DELETE /api/component-entries/[id] - Delete a component entry
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '@/lib/types';
import {
  getComponentEntry,
  updateComponentEntry,
  deleteComponentEntry,
} from '@/lib/component-populate';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid entry ID' });
  }

  try {
    if (req.method === 'GET') {
      const { populate } = req.query;
      const shouldPopulate = populate === 'true';

      const entry = await getComponentEntry(id, shouldPopulate);

      if (!entry) {
        return res.status(404).json({ error: 'Component entry not found' });
      }

      return res.status(200).json({ data: entry });
    }

    if (req.method === 'PUT') {
      const { data } = req.body;

      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Component data is required' });
      }

      const entry = await updateComponentEntry(id, data);

      return res.status(200).json({ data: entry });
    }

    if (req.method === 'DELETE') {
      await deleteComponentEntry(id);

      return res.status(200).json({ message: 'Component entry deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Component Entry API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
