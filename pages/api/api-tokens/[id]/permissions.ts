/**
 * API Token Permissions Details
 * GET /api/api-tokens/[id]/permissions - Get detailed permission info for a token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getAccessToken } from '@/lib/auth/cookies';
import {
  getTokenPermissionSummary,
  getTokenUsageStats,
  validateTokenIntegrity,
} from '@/lib/api-tokens/permissions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify admin authentication (JWT only)
    const token = getAccessToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No access token found',
      });
    }

    try {
      verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token',
      });
    }

    const tokenId = req.query.id as string;

    if (req.method === 'GET') {
      // Get comprehensive permission analysis
      const [summary, usage, validation] = await Promise.all([
        getTokenPermissionSummary(tokenId),
        getTokenUsageStats(tokenId),
        validateTokenIntegrity(tokenId),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          summary,
          usage,
          validation,
        },
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error: any) {
    console.error('Token permissions error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
