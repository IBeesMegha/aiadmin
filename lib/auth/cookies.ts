/**
 * Cookie Management Utilities
 * Handles secure cookie operations for authentication tokens
 */

import { serialize, parse } from 'cookie';
import type { NextApiResponse } from 'next';
import type { IncomingMessage } from 'http';

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
}

/**
 * Set a secure HTTP-only cookie
 * @param res - Next.js API response
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function setCookie(
  res: NextApiResponse,
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const defaultOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...options,
  };

  const cookie = serialize(name, value, defaultOptions);
  
  // Handle multiple Set-Cookie headers
  const existingCookies = res.getHeader('Set-Cookie') || [];
  const cookies = Array.isArray(existingCookies)
    ? existingCookies
    : [String(existingCookies)];
  
  res.setHeader('Set-Cookie', [...cookies, cookie]);
}

/**
 * Get a cookie value from request
 * @param req - Incoming HTTP request
 * @param name - Cookie name
 * @returns Cookie value or undefined
 */
export function getCookie(
  req: IncomingMessage,
  name: string
): string | undefined {
  const cookies = parse(req.headers.cookie || '');
  return cookies[name];
}

/**
 * Delete a cookie
 * @param res - Next.js API response
 * @param name - Cookie name
 */
export function deleteCookie(res: NextApiResponse, name: string): void {
  setCookie(res, name, '', {
    maxAge: -1,
    path: '/',
  });
}

/**
 * Set authentication cookies (access + refresh tokens)
 * @param res - Next.js API response
 * @param accessToken - JWT access token
 * @param refreshToken - JWT refresh token
 */
export function setAuthCookies(
  res: NextApiResponse,
  accessToken: string,
  refreshToken: string
): void {
  // Access token - 15 minutes
  setCookie(res, COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    maxAge: 15 * 60, // 15 minutes in seconds
  });

  // Refresh token - 7 days
  setCookie(res, COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Clear all authentication cookies
 * @param res - Next.js API response
 */
export function clearAuthCookies(res: NextApiResponse): void {
  deleteCookie(res, COOKIE_NAMES.ACCESS_TOKEN);
  deleteCookie(res, COOKIE_NAMES.REFRESH_TOKEN);
}

/**
 * Get access token from request cookies
 * @param req - Incoming HTTP request
 * @returns Access token or undefined
 */
export function getAccessToken(req: IncomingMessage): string | undefined {
  return getCookie(req, COOKIE_NAMES.ACCESS_TOKEN);
}

/**
 * Get refresh token from request cookies
 * @param req - Incoming HTTP request
 * @returns Refresh token or undefined
 */
export function getRefreshToken(req: IncomingMessage): string | undefined {
  return getCookie(req, COOKIE_NAMES.REFRESH_TOKEN);
}
