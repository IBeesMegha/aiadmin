/**
 * Create API Token Page - Redesigned
 * Supports Full Access, Read Only, and Custom token types
 */

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { ArrowLeft, Key, Copy, Check, AlertTriangle, Info, Search, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface ApiEndpoint {
  endpoint: string;
  method: string;
  description: string;
  module: string;
}

interface ModuleData {
  module: string;
  displayName: string;
  endpoints: ApiEndpoint[];
}

interface SelectedEndpoint {
  module: string;
  endpoint: string;
  method: string;
}

export default function CreateApiTokenPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'read_only' | 'full_access' | 'custom'>('read_only');
  const [expiresIn, setExpiresIn] = useState('unlimited');
  const [selectedEndpoints, setSelectedEndpoints] = useState<SelectedEndpoint[]>([]);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchEndpoints();
  }, []);

  useEffect(() => {
    // Auto-select based on token type
    if (type === 'read_only') {
      selectReadOnlyEndpoints();
    } else if (type === 'full_access') {
      selectAllEndpoints();
    } else {
      setSelectedEndpoints([]);
    }
  }, [type, modules]);

  const fetchEndpoints = async () => {
    try {
      const response = await fetch('/api/api-tokens/endpoints');
      const result = await response.json();

      if (result.success) {
        setModules(result.data.modules);
        // Expand all modules by default
        const allModules = new Set<string>(result.data.modules.map((m: ModuleData) => m.module));
        setExpandedModules(allModules);
      }
    } catch (error) {
      console.error('Error fetching endpoints:', error);
    }
  };

  const selectReadOnlyEndpoints = () => {
    const readOnly = modules.flatMap((m) =>
      m.endpoints
        .filter((ep) => ep.method === 'GET')
        .map((ep) => ({
          module: m.module,
          endpoint: ep.endpoint,
          method: ep.method,
        }))
    );
    setSelectedEndpoints(readOnly);
  };

  const selectAllEndpoints = () => {
    const all = modules.flatMap((m) =>
      m.endpoints.map((ep) => ({
        module: m.module,
        endpoint: ep.endpoint,
        method: ep.method,
      }))
    );
    setSelectedEndpoints(all);
  };

  const toggleModule = (moduleName: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleName)) {
      newExpanded.delete(moduleName);
    } else {
      newExpanded.add(moduleName);
    }
    setExpandedModules(newExpanded);
  };

  const isEndpointSelected = (endpoint: string, method: string) => {
    return selectedEndpoints.some(
      (ep) => ep.endpoint === endpoint && ep.method === method
    );
  };

  const toggleEndpoint = (module: string, endpoint: string, method: string) => {
    if (type !== 'custom') return; // Only allow manual selection for custom

    const key = `${endpoint}:${method}`;
    const exists = selectedEndpoints.some(
      (ep) => ep.endpoint === endpoint && ep.method === method
    );

    if (exists) {
      setSelectedEndpoints(
        selectedEndpoints.filter(
          (ep) => !(ep.endpoint === endpoint && ep.method === method)
        )
      );
    } else {
      setSelectedEndpoints([...selectedEndpoints, { module, endpoint, method }]);
    }
  };

  const selectAllInModule = (moduleName: string) => {
    if (type !== 'custom') return;

    const module = modules.find((m) => m.module === moduleName);
    if (!module) return;

    const moduleEndpoints = module.endpoints.map((ep) => ({
      module: moduleName,
      endpoint: ep.endpoint,
      method: ep.method,
    }));

    // Remove existing endpoints from this module
    const otherEndpoints = selectedEndpoints.filter((ep) => ep.module !== moduleName);
    
    // Add all endpoints from this module
    setSelectedEndpoints([...otherEndpoints, ...moduleEndpoints]);
  };

  const deselectAllInModule = (moduleName: string) => {
    if (type !== 'custom') return;
    setSelectedEndpoints(selectedEndpoints.filter((ep) => ep.module !== moduleName));
  };

  const isModuleFullySelected = (moduleName: string) => {
    const module = modules.find((m) => m.module === moduleName);
    if (!module) return false;

    return module.endpoints.every((ep) =>
      selectedEndpoints.some(
        (sel) => sel.endpoint === ep.endpoint && sel.method === ep.method
      )
    );
  };

  const filteredModules = modules.filter((module) =>
    searchQuery === '' ||
    module.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.endpoints.some((ep) =>
      ep.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      alert('Please enter a token name');
      return;
    }

    if (type === 'custom' && selectedEndpoints.length === 0) {
      alert('Please select at least one API endpoint for custom token');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/api-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          type,
          expiresIn: expiresIn === 'unlimited' ? null : expiresIn,
          endpoints: selectedEndpoints,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCreatedToken(result.data.token);
      } else {
        alert(result.error || 'Failed to create token');
      }
    } catch (error) {
      console.error('Error creating token:', error);
      alert('Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PUT: 'bg-yellow-100 text-yellow-700',
      PATCH: 'bg-orange-100 text-orange-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  if (createdToken) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-green-100 rounded-full">
                <Key size={48} className="text-green-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              API Token Created Successfully!
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Make sure to copy your API token now. You won&apos;t be able to see it again!
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
              <AlertTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-medium text-yellow-900 mb-1">Important!</h3>
                <p className="text-sm text-yellow-800">
                  This is the only time you will see this token. Store it securely and don&apos;t share it.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your API Token:
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-white border border-gray-300 rounded px-4 py-3 text-sm font-mono break-all">
                  {createdToken}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
                <Info size={18} />
                <span>How to use this token:</span>
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                Include this token in the Authorization header of your API requests:
              </p>
              <code className="block bg-blue-100 rounded px-3 py-2 text-xs font-mono text-blue-900">
                Authorization: Bearer {createdToken}
              </code>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => router.push('/admin/settings/api-tokens')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to API Tokens
              </button>
              <button
                onClick={() => {
                  setCreatedToken(null);
                  setName('');
                  setDescription('');
                  setType('read_only');
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Create Another Token
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isDisabled = type !== 'custom';

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/settings/api-tokens"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to API Tokens</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New API Token</h1>
          <p className="text-gray-600 mt-2">
            Generate a new API token for frontend/external access (Admin APIs use JWT only)
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
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
                    placeholder="e.g., Frontend Website Token, Mobile App Token"
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
              </div>
            </div>

            {/* Token Type */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setType('read_only')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    type === 'read_only'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">Read Only</div>
                  <div className="text-sm text-gray-600">
                    Only GET requests. All read endpoints auto-selected and locked.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setType('full_access')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    type === 'full_access'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">Full Access</div>
                  <div className="text-sm text-gray-600">
                    All methods (GET, POST, PUT, DELETE). All endpoints auto-selected and locked.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setType('custom')}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    type === 'custom'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">Custom</div>
                  <div className="text-sm text-gray-600">
                    Manually select specific API endpoints and methods.
                  </div>
                </button>
              </div>
            </div>

            {/* Token Duration */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Duration</h2>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
                <option value="unlimited">Unlimited (Never expires)</option>
              </select>
            </div>

            {/* API Endpoints */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  API Endpoints ({selectedEndpoints.length} selected)
                </h2>
                {type === 'custom' && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search endpoints..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {isDisabled && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">
                    {type === 'read_only' &&
                      '✓ All GET (read-only) endpoints are automatically selected and cannot be modified.'}
                    {type === 'full_access' &&
                      '✓ All endpoints with all methods are automatically selected and cannot be modified.'}
                  </p>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {filteredModules.map((module) => (
                  <div key={module.module} className="bg-white">
                    <button
                      type="button"
                      onClick={() => toggleModule(module.module)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      disabled={isDisabled}
                    >
                      <div className="flex items-center space-x-3">
                        {expandedModules.has(module.module) ? (
                          <ChevronDown size={20} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={20} className="text-gray-400" />
                        )}
                        <span className="font-medium text-gray-900">{module.displayName}</span>
                        <span className="text-sm text-gray-500">
                          ({module.endpoints.filter((ep) => isEndpointSelected(ep.endpoint, ep.method)).length}/{module.endpoints.length})
                        </span>
                      </div>
                      {type === 'custom' && (
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          {!isModuleFullySelected(module.module) ? (
                            <button
                              type="button"
                              onClick={() => selectAllInModule(module.module)}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Select All
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => deselectAllInModule(module.module)}
                              className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                            >
                              Deselect All
                            </button>
                          )}
                        </div>
                      )}
                    </button>

                    {expandedModules.has(module.module) && (
                      <div className="px-4 pb-4 space-y-2 bg-gray-50">
                        {module.endpoints.map((ep) => (
                          <label
                            key={`${ep.endpoint}:${ep.method}`}
                            className={`flex items-center space-x-3 p-3 border border-gray-200 rounded-lg bg-white ${
                              isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isEndpointSelected(ep.endpoint, ep.method)}
                              onChange={() => toggleEndpoint(module.module, ep.endpoint, ep.method)}
                              disabled={isDisabled}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getMethodColor(ep.method)}`}>
                                  {ep.method}
                                </span>
                                <code className="text-sm font-mono text-gray-900">{ep.endpoint}</code>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{ep.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Token'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
