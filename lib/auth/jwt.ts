/**
 * JWT Token Management
 * Handles creation and verification of access and refresh tokens
 */

import jwt from 'jsonwebtoken';

// Security: Store these in environment variables
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-change-in-production';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
  sessionId: string;
}

/**
 * Generate an access token (short-lived)
 * @param payload - User data to encode
 * @returns JWT access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  const tokenPayload: AccessTokenPayload = {
    ...payload,
    type: 'access',
  };

  return jwt.sign(tokenPayload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate a refresh token (long-lived)
 * @param payload - User data to encode
 * @param sessionId - Session ID for token rotation
 * @returns JWT refresh token
 */
export function generateRefreshToken(
  payload: TokenPayload,
  sessionId: string
): string {
  const tokenPayload: RefreshTokenPayload = {
    ...payload,
    type: 'refresh',
    sessionId,
  };

  return jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

/**
 * Verify and decode an access token
 * @param token - JWT access token
 * @returns Decoded token payload
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify and decode a refresh token
 * @param token - JWT refresh token
 * @returns Decoded token payload
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Get token expiration time in milliseconds
 * @param type - Token type
 * @returns Expiration time in ms
 */
export function getTokenExpiry(type: 'access' | 'refresh'): number {
  if (type === 'access') {
    return 15 * 60 * 1000; // 15 minutes
  }
  return 7 * 24 * 60 * 60 * 1000; // 7 days
}
