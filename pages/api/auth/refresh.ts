/**
 * Refresh Token API Route
 * POST /api/auth/refresh
 * Refreshes access token using refresh token
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { refreshAccessToken } from '@/lib/auth/auth';
import { getRefreshToken, setAuthCookies } from '@/lib/auth/cookies';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Get refresh token from cookies
    const refreshToken = getRefreshToken(req);

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not found',
      });
    }

    // Refresh tokens (token rotation)
    const tokens = await refreshAccessToken(refreshToken);

    // Set new cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);

    return res.status(401).json({
      success: false,
      error: error.message || 'Failed to refresh token',
    });
  }
}
