/**
 * Public API: Awards
 * GET /api/public/awards - List all awards
 * 
 * This endpoint requires an API token with read permission
 * 
 * Usage:
 * curl -H "Authorization: Bearer YOUR_TOKEN" \
 *      https://your-domain.com/api/public/awards
 */

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { findManyDynamic } from '@/lib/dynamic-prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(
  req: ApiTokenRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const awards = await findManyDynamic('award');

    return res.status(200).json({
      success: true,
      data: awards,
      count: Array.isArray(awards) ? awards.length : 0,
    });
  } catch (error: any) {
    console.error('Error fetching awards:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

export default withApiToken(handler);
