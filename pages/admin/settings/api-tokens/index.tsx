/**
 * API Tokens Management Page
 * List and manage API tokens
 */

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { Plus, Key, Trash2, Edit, Copy, Check, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

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
  permissions: any[];
}

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/api-tokens');
      const result = await response.json();

      if (result.success) {
        setTokens(result.data);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API token? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/api-tokens/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        fetchTokens();
      } else {
        alert(result.error || 'Failed to delete token');
      }
    } catch (error) {
      console.error('Error deleting token:', error);
      alert('Failed to delete token');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/api-tokens/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchTokens();
      } else {
        alert(result.error || 'Failed to update token');
      }
    } catch (error) {
      console.error('Error updating token:', error);
      alert('Failed to update token');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'read_only':
        return 'bg-blue-100 text-blue-700';
      case 'full_access':
        return 'bg-red-100 text-red-700';
      case 'custom':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'read_only':
        return 'Read Only';
      case 'full_access':
        return 'Full Access';
      case 'custom':
        return 'Custom';
      default:
        return type;
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
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

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Tokens</h1>
            <p className="text-gray-600 mt-2">
              Create and manage API tokens for programmatic access
            </p>
          </div>
          <Link
            href="/admin/settings/api-tokens/create"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>Create New Token</span>
          </Link>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <AlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">About API Tokens</h3>
            <p className="text-sm text-blue-800">
              API tokens allow you to authenticate API requests without using your account credentials.
              You can create tokens with different permission levels for different use cases.
            </p>
          </div>
        </div>

        {/* Tokens List */}
        {tokens.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Key className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No API Tokens</h2>
            <p className="text-gray-600 mb-6">
              You haven&apos;t created any API tokens yet. Create one to get started.
            </p>
            <Link
              href="/admin/settings/api-tokens/create"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span>Create Your First Token</span>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Token
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tokens.map((token) => (
                    <tr key={token.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Key size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{token.name}</p>
                            <p className="text-xs text-gray-500">
                              Created {format(new Date(token.createdAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {token.description || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                            token.type
                          )}`}
                        >
                          {getTypeLabel(token.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {token.tokenPreview}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        {token.lastUsedAt ? (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock size={14} />
                            <span>{format(new Date(token.lastUsedAt), 'MMM dd, HH:mm')}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {token.expiresAt ? (
                          <span
                            className={`text-sm ${
                              isExpired(token.expiresAt)
                                ? 'text-red-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {format(new Date(token.expiresAt), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(token.id, token.isActive)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            token.isActive && !isExpired(token.expiresAt)
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {token.isActive && !isExpired(token.expiresAt) ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/admin/settings/api-tokens/edit/${token.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit token"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(token.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete token"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
