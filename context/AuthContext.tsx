/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '@/lib/api-client';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';

interface Role {
  id: string;
  name: string;
  slug: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  roleId: string | null;
  isActive: boolean;
  role?: Role | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isSuperAdmin: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Auto-refresh token using custom hook
  useTokenRefresh({
    enabled: !!user,
    refreshIntervalMs: 10 * 60 * 1000, // 10 minutes (before 15min expiry)
    onRefreshError: () => {
      // If refresh fails, log user out
      console.error('[Auth] Token refresh failed, logging out');
      setUser(null);
      setPermissions([]);
      router.push('/admin/login');
    },
  });

  // Refresh token when user returns to tab after being away
  useVisibilityRefresh({
    enabled: !!user,
    minAwayTimeMs: 5 * 60 * 1000, // Refresh if away for 5+ minutes
    onRefresh: () => {
      // Optionally refresh user data
      refreshUser();
    },
  });

  /**
   * Check if user is authenticated
   */
  const checkAuth = async () => {
    try {
      const response = await fetchWithAuth('/api/auth/me', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        setPermissions(data.data.permissions || []);
      } else {
        setUser(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.data.user);
      setPermissions(data.data.permissions || []);
      
      // Redirect to admin dashboard
      router.push('/admin');
    } catch (error: any) {
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
      setPermissions([]);
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear user state even if API call fails
      setUser(null);
      setPermissions([]);
      router.push('/admin/login');
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      const response = await fetchWithAuth('/api/auth/me', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        setPermissions(data.data.permissions || []);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: string): boolean => {
    // Super admin bypasses all checks
    if (user?.role?.slug === 'super_admin') {
      return true;
    }
    return permissions.includes(permission);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (perms: string[]): boolean => {
    // Super admin bypasses all checks
    if (user?.role?.slug === 'super_admin') {
      return true;
    }
    return perms.some(p => permissions.includes(p));
  };

  /**
   * Check if user is super admin
   */
  const isSuperAdmin = (): boolean => {
    return user?.role?.slug === 'super_admin';
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    permissions,
    hasPermission,
    hasAnyPermission,
    isSuperAdmin,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
