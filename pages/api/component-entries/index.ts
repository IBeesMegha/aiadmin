/**
 * Component Entries API
 * 
 * POST /api/component-entries - Create a new component entry
 * GET /api/component-entries?component=banner - Get all entries for a component
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '@/lib/types';
import {
  createComponentEntry,
  getComponentEntries,
} from '@/lib/component-populate';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    if (req.method === 'GET') {
      const { component, populate } = req.query;

      if (!component || typeof component !== 'string') {
        return res.status(400).json({ error: 'Component name is required' });
      }

      const shouldPopulate = populate === 'true';
      const entries = await getComponentEntries(component, shouldPopulate);

      return res.status(200).json({ data: entries });
    }

    if (req.method === 'POST') {
      const { component, data } = req.body;

      if (!component || typeof component !== 'string') {
        return res.status(400).json({ error: 'Component name is required' });
      }

      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Component data is required' });
      }

      const entry = await createComponentEntry(component, data);

      return res.status(201).json({ data: entry });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Component Entries API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
