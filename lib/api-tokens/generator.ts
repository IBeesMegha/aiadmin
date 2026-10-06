/**
 * API Token Generator Utility
 * Generates secure random tokens for API authentication
 */

import crypto from 'crypto';

/**
 * Generate a secure random API token
 * Format: prefix_randomBytes
 */
export function generateApiToken(prefix: string = 'at'): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

/**
 * Hash an API token for secure storage
 */
export function hashApiToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify if a token matches the hashed version
 */
export function verifyApiToken(token: string, hashedToken: string): boolean {
  const tokenHash = hashApiToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hashedToken, 'hex')
  );
}
