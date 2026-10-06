/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions
 */

import React, { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface AnyPermissionGuardProps {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const AnyPermissionGuard: React.FC<AnyPermissionGuardProps> = ({
  permissions,
  children,
  fallback = null,
}) => {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface SuperAdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({
  children,
  fallback = null,
}) => {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
