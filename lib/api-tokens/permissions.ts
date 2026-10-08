/**
 * API Token Permissions Helper
 * Utilities for managing and validating token permissions
 */

import { prisma } from '@/lib/prisma';

export interface TokenPermissionSummary {
  tokenId: string;
  tokenName: string;
  tokenType: string;
  permissions: {
    read: string[];
    write: string[];
    delete: string[];
  };
  modules: string[];
  totalEndpoints: number;
}

/**
 * Get a human-readable summary of token permissions
 */
export async function getTokenPermissionSummary(
  tokenId: string
): Promise<TokenPermissionSummary> {
  const token = await prisma.apiToken.findUnique({
    where: { id: tokenId },
    include: {
      endpoints: true,
    },
  });

  if (!token) {
    throw new Error('Token not found');
  }

  const permissions = {
    read: [] as string[],
    write: [] as string[],
    delete: [] as string[],
  };

  const modulesSet = new Set<string>();

  token.endpoints.forEach((ep) => {
    modulesSet.add(ep.module);

    if (ep.method === 'GET') {
      permissions.read.push(`${ep.method} ${ep.endpoint}`);
    } else if (ep.method === 'DELETE') {
      permissions.delete.push(`${ep.method} ${ep.endpoint}`);
    } else {
      permissions.write.push(`${ep.method} ${ep.endpoint}`);
    }
  });

  return {
    tokenId: token.id,
    tokenName: token.name,
    tokenType: token.type,
    permissions,
    modules: Array.from(modulesSet),
    totalEndpoints: token.endpoints.length,
  };
}

/**
 * Check if a token has permission for a specific endpoint and method
 */
export async function hasTokenPermission(
  tokenId: string,
  endpoint: string,
  method: string
): Promise<boolean> {
  const permission = await prisma.apiTokenEndpoint.findFirst({
    where: {
      tokenId,
      endpoint,
      method: method.toUpperCase(),
    },
  });

  return !!permission;
}

/**
 * Get all modules accessible by a token
 */
export async function getTokenModules(tokenId: string): Promise<string[]> {
  const endpoints = await prisma.apiTokenEndpoint.findMany({
    where: { tokenId },
    distinct: ['module'],
    select: { module: true },
  });

  return endpoints.map((ep) => ep.module);
}

/**
 * Compare two tokens and show permission differences
 */
export async function compareTokenPermissions(
  tokenId1: string,
  tokenId2: string
): Promise<{
  token1Only: string[];
  token2Only: string[];
  shared: string[];
}> {
  const [token1Endpoints, token2Endpoints] = await Promise.all([
    prisma.apiTokenEndpoint.findMany({
      where: { tokenId: tokenId1 },
    }),
    prisma.apiTokenEndpoint.findMany({
      where: { tokenId: tokenId2 },
    }),
  ]);

  const makeKey = (ep: any) => `${ep.method}:${ep.endpoint}`;

  const token1Keys = new Set(token1Endpoints.map(makeKey));
  const token2Keys = new Set(token2Endpoints.map(makeKey));

  const token1Only: string[] = [];
  const token2Only: string[] = [];
  const shared: string[] = [];

  token1Keys.forEach((key) => {
    if (token2Keys.has(key)) {
      shared.push(key);
    } else {
      token1Only.push(key);
    }
  });

  token2Keys.forEach((key) => {
    if (!token1Keys.has(key)) {
      token2Only.push(key);
    }
  });

  return { token1Only, token2Only, shared };
}

/**
 * Validate token type and endpoints match
 * Ensures read_only tokens don't have write permissions, etc.
 */
export async function validateTokenIntegrity(tokenId: string): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const token = await prisma.apiToken.findUnique({
    where: { id: tokenId },
    include: {
      endpoints: true,
    },
  });

  if (!token) {
    return { valid: false, issues: ['Token not found'] };
  }

  const issues: string[] = [];

  // Check read_only tokens don't have write permissions
  if (token.type === 'read_only') {
    const writeEndpoints = token.endpoints.filter(
      (ep) => ep.method !== 'GET'
    );

    if (writeEndpoints.length > 0) {
      issues.push(
        `Read-only token has ${writeEndpoints.length} write permission(s): ${writeEndpoints
          .map((ep) => `${ep.method} ${ep.endpoint}`)
          .join(', ')}`
      );
    }
  }

  // Check custom tokens have at least one endpoint
  if (token.type === 'custom' && token.endpoints.length === 0) {
    issues.push('Custom token has no endpoint permissions');
  }

  // Check for duplicate endpoints
  const endpointKeys = token.endpoints.map(
    (ep) => `${ep.method}:${ep.endpoint}`
  );
  const duplicates = endpointKeys.filter(
    (key, index) => endpointKeys.indexOf(key) !== index
  );

  if (duplicates.length > 0) {
    issues.push(`Duplicate endpoints found: ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get token usage statistics
 */
export async function getTokenUsageStats(tokenId: string): Promise<{
  tokenId: string;
  tokenName: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  daysSinceLastUse: number | null;
  isExpired: boolean;
}> {
  const token = await prisma.apiToken.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    throw new Error('Token not found');
  }

  const now = new Date();
  const isExpired = token.expiresAt ? token.expiresAt < now : false;

  const daysUntilExpiry = token.expiresAt
    ? Math.floor((token.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const daysSinceLastUse = token.lastUsedAt
    ? Math.floor((now.getTime() - token.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    tokenId: token.id,
    tokenName: token.name,
    isActive: token.isActive,
    createdAt: token.createdAt,
    lastUsedAt: token.lastUsedAt,
    expiresAt: token.expiresAt,
    daysUntilExpiry,
    daysSinceLastUse,
    isExpired,
  };
}

/**
 * Get all tokens grouped by type
 */
export async function getTokensByType(): Promise<{
  read_only: number;
  full_access: number;
  custom: number;
  total: number;
  active: number;
  inactive: number;
}> {
  const tokens = await prisma.apiToken.findMany({
    select: {
      type: true,
      isActive: true,
    },
  });

  const stats = {
    read_only: 0,
    full_access: 0,
    custom: 0,
    total: tokens.length,
    active: 0,
    inactive: 0,
  };

  tokens.forEach((token) => {
    if (token.type === 'read_only') stats.read_only++;
    if (token.type === 'full_access') stats.full_access++;
    if (token.type === 'custom') stats.custom++;
    if (token.isActive) stats.active++;
    else stats.inactive++;
  });

  return stats;
}

/**
 * Find tokens that haven't been used in X days
 */
export async function findUnusedTokens(
  daysThreshold: number = 30
): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    lastUsedAt: Date | null;
    daysSinceLastUse: number | null;
  }>
> {
  const tokens = await prisma.apiToken.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      type: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  const now = new Date();
  const threshold = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

  return tokens
    .filter((token) => {
      if (!token.lastUsedAt) {
        // Never used - check if created more than threshold ago
        return token.createdAt < threshold;
      }
      return token.lastUsedAt < threshold;
    })
    .map((token) => ({
      id: token.id,
      name: token.name,
      type: token.type,
      lastUsedAt: token.lastUsedAt,
      daysSinceLastUse: token.lastUsedAt
        ? Math.floor(
            (now.getTime() - token.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null,
    }));
}

/**
 * Get tokens expiring soon
 */
export async function getExpiringTokens(
  daysThreshold: number = 7
): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    expiresAt: Date;
    daysUntilExpiry: number;
  }>
> {
  const now = new Date();
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  const tokens = await prisma.apiToken.findMany({
    where: {
      isActive: true,
      expiresAt: {
        lte: threshold,
        gte: now,
      },
    },
    select: {
      id: true,
      name: true,
      type: true,
      expiresAt: true,
    },
  });

  return tokens.map((token) => ({
    id: token.id,
    name: token.name,
    type: token.type,
    expiresAt: token.expiresAt!,
    daysUntilExpiry: Math.floor(
      (token.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));
}
