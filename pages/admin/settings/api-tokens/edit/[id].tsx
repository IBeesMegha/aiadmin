/**
 * Edit API Token Page
 */

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { ArrowLeft, Key } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Resource {
  resource: string;
  displayName: string;
  availableActions: string[];
}

interface PermissionState {
  resource: string;
  actions: string[];
}

interface ApiToken {
  id: string;
  name: string;
  description: string;
  type: string;
  tokenPreview: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
  permissions: PermissionState[];
}

export default function EditApiTokenPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [token, setToken] = useState<ApiToken | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<PermissionState[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchToken();
      fetchResources();
    }
  }, [id]);

  const fetchToken = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/api-tokens/${id}`);
      const result = await response.json();

      if (result.success) {
        const tokenData = result.data;
        setToken(tokenData);
        setName(tokenData.name);
        setDescription(tokenData.description || '');
        setIsActive(tokenData.isActive);
        setPermissions(tokenData.permissions);
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/api-tokens/resources');
      const result = await response.json();

      if (result.success) {
        setResources(result.data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const handlePermissionToggle = (resource: string, action: string) => {
    const existingPerm = permissions.find((p) => p.resource === resource);

    if (existingPerm) {
      if (existingPerm.actions.includes(action)) {
        // Remove action
        const newActions = existingPerm.actions.filter((a) => a !== action);
        if (newActions.length === 0) {
          // Remove permission entirely
          setPermissions(permissions.filter((p) => p.resource !== resource));
        } else {
          setPermissions(
            permissions.map((p) =>
              p.resource === resource ? { ...p, actions: newActions } : p
            )
          );
        }
      } else {
        // Add action
        setPermissions(
          permissions.map((p) =>
            p.resource === resource ? { ...p, actions: [...p.actions, action] } : p
          )
        );
      }
    } else {
      // Create new permission
      setPermissions([...permissions, { resource, actions: [action] }]);
    }
  };

  const hasPermission = (resource: string, action: string) => {
    const perm = permissions.find((p) => p.resource === resource);
    return perm ? perm.actions.includes(action) : false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      alert('Please enter a token name');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/api-tokens/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          isActive,
          permissions: token?.type === 'custom' ? permissions : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/admin/settings/api-tokens');
      } else {
        alert(result.error || 'Failed to update token');
      }
    } catch (error) {
      console.error('Error updating token:', error);
      alert('Failed to update token');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!token) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Token not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/settings/api-tokens"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to API Tokens</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit API Token</h1>
          <p className="text-gray-600 mt-2">
            Update token settings and permissions
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            {/* Token Preview */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3 mb-2">
                <Key className="text-gray-600" size={20} />
                <span className="font-medium text-gray-900">Token Preview</span>
              </div>
              <code className="text-sm bg-white border border-gray-300 rounded px-3 py-2 font-mono block">
                {token.tokenPreview}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                For security, only the last 8 characters are shown
              </p>
            </div>

            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Read Only Token, Blog API Token"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe the purpose of this token"
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Token is active
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Inactive tokens cannot be used for authentication
                  </p>
                </div>
              </div>
            </div>

            {/* Token Type (Read-only) */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Type</h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  {token.type === 'read_only' && 'Read Only'}
                  {token.type === 'full_access' && 'Full Access'}
                  {token.type === 'custom' && 'Custom'}
                </span>
                <p className="text-sm text-gray-600 mt-2">
                  Token type cannot be changed after creation
                </p>
              </div>
            </div>

            {/* Custom Permissions (only for custom tokens) */}
            {token.type === 'custom' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>
                <div className="space-y-4">
                  {resources.map((resource) => (
                    <div
                      key={resource.resource}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="font-medium text-gray-900 mb-3">
                        {resource.displayName}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {resource.availableActions.map((action) => (
                          <label
                            key={action}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={hasPermission(resource.resource, action)}
                              onChange={() =>
                                handlePermissionToggle(resource.resource, action)
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">{action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/admin/settings/api-tokens"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
