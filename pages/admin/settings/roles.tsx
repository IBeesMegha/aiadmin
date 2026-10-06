/**
 * Roles Management Page
 * /admin/settings/roles
 * CRUD operations for role management with permission matrix
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/admin/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Users,
  Lock,
  CheckSquare,
  Square,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Permission {
  id: string;
  name: string;
  slug: string;
  module: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  _count?: {
    users: number;
    permissions: number;
  };
  permissions?: {
    permission: Permission;
  }[];
}

export default function RolesPage() {
  const { hasPermission, loading: authLoading } = useAuth();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    permissionIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('roles.read')) {
        router.push('/admin/403');
        return;
      }
      fetchRoles();
      fetchPermissions();
    }
  }, [authLoading, hasPermission]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data.data.roles);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(data.data.permissions);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const handleOpenModal = (role?: Role) => {
    if (role) {
      // Navigate to edit page
      router.push(`/admin/settings/roles/${role.id}`);
    } else {
      // Show create modal
      setEditingRole(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        permissionIds: [],
      });
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      permissionIds: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = '/api/roles';
      const method = 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Role created successfully');
        handleCloseModal();
        // Navigate to edit page for the new role
        router.push(`/admin/settings/roles/${data.data.role.id}`);
      } else {
        toast.error(data.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Create role error:', error);
      toast.error('Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.isSystem) {
      toast.error('System roles cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${role.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Role deleted successfully');
        fetchRoles();
      } else {
        toast.error(data.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Delete role error:', error);
      toast.error('Failed to delete role');
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const toggleModulePermissions = (module: string) => {
    const modulePermissions = permissions[module] || [];
    const modulePermissionIds = modulePermissions.map((p) => p.id);
    const allSelected = modulePermissionIds.every((id) =>
      formData.permissionIds.includes(id)
    );

    if (allSelected) {
      // Deselect all
      setFormData((prev) => ({
        ...prev,
        permissionIds: prev.permissionIds.filter(
          (id) => !modulePermissionIds.includes(id)
        ),
      }));
    } else {
      // Select all
      setFormData((prev) => ({
        ...prev,
        permissionIds: [
          ...prev.permissionIds,
          ...modulePermissionIds.filter((id) => !prev.permissionIds.includes(id)),
        ],
      }));
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-600 mt-1">Manage roles and their permissions</p>
          </div>
          {hasPermission('roles.create') && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Role</span>
            </button>
          )}
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    {role.isSystem && (
                      <span className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                        <Lock className="h-3 w-3" />
                        <span>System Role</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {hasPermission('roles.update') && (
                    <button
                      onClick={() => handleOpenModal(role)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit Role"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                  {hasPermission('roles.delete') && !role.isSystem && (
                    <button
                      onClick={() => handleDelete(role)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Role"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {role.description && (
                <p className="text-sm text-gray-600 mb-4">{role.description}</p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{role._count?.users || 0} users</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>{role._count?.permissions || 0} permissions</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {roles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new role</p>
          </div>
        )}

        {/* Modal - Only for Create */}
        {showModal && !editingRole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Role
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData({
                          ...formData,
                          name,
                          slug: generateSlug(name),
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Content Manager"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., content_manager"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of this role"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    After creating the role, you'll be able to configure detailed permissions on the next page.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create & Configure'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
