/**
 * Logout API Route
 * POST /api/auth/logout
 * Invalidates user session and clears cookies
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRefreshToken } from '@/lib/auth/jwt';
import { getRefreshToken, clearAuthCookies } from '@/lib/auth/cookies';
import { logoutUser } from '@/lib/auth/auth';

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

    if (refreshToken) {
      try {
        // Verify and decode refresh token to get session ID
        const decoded = verifyRefreshToken(refreshToken);
        
        // Delete session from database
        await logoutUser(decoded.sessionId);
      } catch (error) {
        // Token might be invalid/expired, but we still clear cookies
        console.error('Error invalidating session:', error);
      }
    }

    // Clear authentication cookies
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);

    // Still clear cookies even if there's an error
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }
}
