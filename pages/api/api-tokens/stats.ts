/**
 * API Token Statistics and Analytics
 * GET /api/api-tokens/stats - Get token usage statistics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { getAccessToken } from '@/lib/auth/cookies';
import {
  getTokensByType,
  findUnusedTokens,
  getExpiringTokens,
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

    if (req.method === 'GET') {
      const { unusedDays, expiringDays } = req.query;

      // Get overall statistics
      const typeStats = await getTokensByType();

      // Find unused tokens (default 30 days)
      const unusedThreshold = unusedDays ? parseInt(unusedDays as string) : 30;
      const unusedTokens = await findUnusedTokens(unusedThreshold);

      // Find expiring tokens (default 7 days)
      const expiringThreshold = expiringDays ? parseInt(expiringDays as string) : 7;
      const expiringTokens = await getExpiringTokens(expiringThreshold);

      return res.status(200).json({
        success: true,
        data: {
          overview: typeStats,
          unused: {
            threshold: unusedThreshold,
            count: unusedTokens.length,
            tokens: unusedTokens,
          },
          expiring: {
            threshold: expiringThreshold,
            count: expiringTokens.length,
            tokens: expiringTokens,
          },
        },
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  } catch (error: any) {
    console.error('Token stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
