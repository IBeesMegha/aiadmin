/**
 * Core Authentication Service
 * Handles user authentication, session management, and token operations
 */

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from './password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from './jwt';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Authenticate user with email and password
 * @param credentials - User login credentials
 * @param metadata - Session metadata (user agent, IP)
 * @returns Authentication result with tokens
 */
export async function authenticateUser(
  credentials: LoginCredentials,
  metadata: SessionMetadata = {}
): Promise<AuthResult> {
  const { email, password } = credentials;

  try {
    console.log('[AUTH] Starting authentication for:', email);
    
    // Find user by email with role and permissions
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    console.log('[AUTH] User found:', !!user);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Create session and generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role?.slug || 'viewer',
    };

    // Create session with refresh token
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: '', // Will be updated after token generation
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload, session.id);

    // Hash and store refresh token
    const hashedRefreshToken = await hashPassword(refreshToken);
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: hashedRefreshToken },
    });

    console.log('[AUTH] Authentication successful');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role?.slug || 'viewer',
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Valid refresh token
 * @returns New access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);

  // Find session
  const session = await prisma.session.findUnique({
    where: { id: decoded.sessionId },
    include: { 
      user: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // Check if session expired
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new Error('Session expired');
  }

  // Verify refresh token hash
  const isTokenValid = await verifyPassword(refreshToken, session.refreshToken);
  if (!isTokenValid) {
    throw new Error('Invalid refresh token');
  }

  // Check if user is still active
  if (!session.user.isActive) {
    throw new Error('Account is deactivated');
  }

  // Generate new tokens (token rotation)
  const tokenPayload: TokenPayload = {
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role?.slug || 'viewer',
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload, session.id);

  // Update session with new refresh token
  const hashedRefreshToken = await hashPassword(newRefreshToken);
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: hashedRefreshToken },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout user and invalidate session
 * @param sessionId - Session ID to invalidate
 */
export async function logoutUser(sessionId: string): Promise<void> {
  await prisma.session.delete({
    where: { id: sessionId },
  });
}

/**
 * Get user by ID
 * @param userId - User ID
 * @returns User data without password
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Create a new user (admin only)
 * @param data - User data
 * @returns Created user
 */
export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  roleId?: string;
}) {
  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      password: hashedPassword,
      name: data.name,
      roleId: data.roleId || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      isActive: true,
      createdAt: true,
      role: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  return user;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
