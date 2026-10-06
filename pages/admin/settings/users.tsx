/**
 * Users Management Page
 * /admin/settings/users
 * CRUD operations for user management
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/admin/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import {
  Users as UsersIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  ShieldOff,
  Loader2,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  createdAt: string;
  role?: Role | null;
}

export default function UsersPage() {
  const { hasPermission, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    roleId: '',
    isActive: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('users.read')) {
        router.push('/admin/403');
        return;
      }
      fetchUsers();
      fetchRoles();
    }
  }, [authLoading, hasPermission]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleOpenModal = (user?: User) => {
    setValidationErrors({}); // Clear previous errors
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name,
        password: '',
        roleId: user.roleId || '',
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        password: '',
        roleId: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setValidationErrors({});
    setFormData({
      email: '',
      name: '',
      password: '',
      roleId: '',
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setValidationErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!editingUser && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.roleId) {
      errors.roleId = 'Please select a role';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error('Please fix the errors below');
      setSubmitting(false);
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = {
        email: formData.email,
        name: formData.name,
        roleId: formData.roleId || null,
        isActive: formData.isActive,
      };

      // Only include password if it's provided
      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'User saved successfully');
        handleCloseModal();
        fetchUsers();
      } else {
        // Handle validation errors from server
        if (data.details && Array.isArray(data.details)) {
          const serverErrors: Record<string, string> = {};
          data.details.forEach((err: any) => {
            const field = err.path?.[0];
            if (field) {
              serverErrors[field] = err.message;
            }
          });
          setValidationErrors(serverErrors);
          toast.error('Please fix the errors below');
        } else {
          toast.error(data.error || 'Failed to save user');
        }
      }
    } catch (error) {
      console.error('Save user error:', error);
      toast.error('Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600 mt-1">Manage system users and their roles</p>
          </div>
          {hasPermission('users.create') && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add User</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.role ? (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {user.role.name}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">No role</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <span className="flex items-center space-x-1 text-green-600">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm">Active</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-red-600">
                        <ShieldOff className="h-4 w-4" />
                        <span className="text-sm">Inactive</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {hasPermission('users.update') && (
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                      {hasPermission('users.delete') && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search' : 'Get started by creating a new user'}
              </p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (validationErrors.name) {
                        setValidationErrors({ ...validationErrors, name: '' });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (validationErrors.email) {
                        setValidationErrors({ ...validationErrors, email: '' });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingUser ? '(leave blank to keep current)' : <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (validationErrors.password) {
                          setValidationErrors({ ...validationErrors, password: '' });
                        }
                      }}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={!editingUser ? 'Minimum 8 characters' : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.roleId}
                    onChange={(e) => {
                      setFormData({ ...formData, roleId: e.target.value });
                      if (validationErrors.roleId) {
                        setValidationErrors({ ...validationErrors, roleId: '' });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.roleId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.roleId && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.roleId}</p>
                  )}
                  {roles.length === 0 && (
                    <p className="mt-1 text-sm text-yellow-600">
                      ⚠️ No roles available. Please create roles first.
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
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
                        Saving...
                      </>
                    ) : (
                      'Save'
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
