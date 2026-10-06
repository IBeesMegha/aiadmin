/**
 * Edit Role Page
 * /admin/settings/roles/[id]
 * Full page role editor with tabbed permission management
 */

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/admin/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import {
  Shield,
  Loader2,
  ArrowLeft,
  Save,
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
  permissions?: {
    permission: Permission;
  }[];
}

interface CollectionType {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

type TabType = 'collection-types' | 'single-types' | 'plugins' | 'settings';

export default function EditRolePage() {
  const { hasPermission, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('collection-types');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: [] as string[],
  });

  // Dynamic data
  const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
  const [singleTypes, setSingleTypes] = useState<CollectionType[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [syncing, setSyncing] = useState(false);

  // Settings/Module permissions
  const settingsModules = [
    { name: 'Dashboard', slug: 'dashboard' },
    { name: 'Media Library', slug: 'media' },
    { name: 'AI Agent', slug: 'ai_agent' },
    { name: 'Users', slug: 'users' },
    { name: 'Roles & Permissions', slug: 'roles' },
    { name: 'Settings', slug: 'settings' },
    { name: 'Content Manager', slug: 'content' },
    { name: 'Content-Type Builder', slug: 'content_type_builder' },
  ];

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission('roles.read')) {
        router.push('/admin/403');
        return;
      }
      if (id) {
        fetchRole();
        fetchCollectionTypes();
        fetchPermissions();
      }
    }
  }, [authLoading, hasPermission, id]);

  const fetchRole = async () => {
    try {
      const response = await fetch(`/api/roles/${id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRole(data.data.role);
        setFormData({
          name: data.data.role.name,
          description: data.data.role.description || '',
          permissionIds: data.data.role.permissions?.map((rp: any) => rp.permission.id) || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch role:', error);
      toast.error('Failed to load role');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionTypes = async () => {
    try {
      const response = await fetch('/api/collection-types', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const collections = data.data || [];
        
        // Separate collection types and single types
        setCollectionTypes(collections.filter((ct: any) => !ct.isSingleType));
        setSingleTypes(collections.filter((ct: any) => ct.isSingleType));
        
        console.log('Collection Types:', collections);
      }
    } catch (error) {
      console.error('Failed to fetch collection types:', error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Role updated successfully');
        router.push('/admin/settings/roles');
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Update role error:', error);
      toast.error('Failed to update role');
    } finally {
      setSubmitting(false);
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

  const toggleAllForModule = (module: string, action: string) => {
    const permissionSlug = `${module}.${action}`;
    const permission = Object.values(permissions)
      .flat()
      .find((p) => p.slug === permissionSlug);
    
    if (permission) {
      togglePermission(permission.id);
    } else {
      // Permission doesn't exist yet - could auto-create here in future
      console.warn(`Permission ${permissionSlug} not found in system`);
      toast.error(`Permission ${action} for ${module} needs to be created in the system first`);
    }
  };

  const isPermissionChecked = (module: string, action: string): boolean => {
    const permissionSlug = `${module}.${action}`;
    const permission = Object.values(permissions)
      .flat()
      .find((p) => p.slug === permissionSlug);
    
    return permission ? formData.permissionIds.includes(permission.id) : false;
  };

  const handleSyncPermissions = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/permissions/sync-collections', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Permissions synced successfully');
        // Reload permissions
        await fetchPermissions();
      } else {
        toast.error(data.error || 'Failed to sync permissions');
      }
    } catch (error) {
      console.error('Sync permissions error:', error);
      toast.error('Failed to sync permissions');
    } finally {
      setSyncing(false);
    }
  };

  const tabs = [
    { id: 'collection-types', label: 'Collection Types' },
    { id: 'single-types', label: 'Single Types' },
    { id: 'plugins', label: 'Plugins' },
    { id: 'settings', label: 'Settings' },
  ];

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!role) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Role not found</h2>
            <button
              onClick={() => router.push('/admin/settings/roles')}
              className="text-blue-600 hover:text-blue-800"
            >
              Go back to roles
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-white border-b sticky top-0 z-20">
            <div className="px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push('/admin/settings/roles')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Role</h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Define the rights given to the role
                    </p>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting || role.isSystem}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 max-w-7xl mx-auto">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={role.isSystem}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="e.g., Author"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Authors can manage the content they have created.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    disabled={role.isSystem}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Brief description of this role"
                  />
                </div>
              </div>
            </div>

            {/* Permissions Card */}
            <div className="bg-white rounded-lg shadow-sm">
              {/* Tabs */}
              <div className="border-b">
                <div className="flex space-x-1 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Selected: <span className="font-semibold">{formData.permissionIds.length}</span> permissions
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncPermissions}
                    disabled={syncing}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>Sync Permissions</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Collection Types Tab */}
                {activeTab === 'collection-types' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Create
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Read
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Update
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Delete
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Publish
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {collectionTypes.map((ct) => (
                          <tr key={ct.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" className="w-4 h-4" />
                                <span>{ct.displayName}</span>
                              </div>
                            </td>
                            {['create', 'read', 'update', 'delete', 'publish'].map((action) => (
                              <td key={action} className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={role.isSystem}
                                  checked={isPermissionChecked(ct.name, action)}
                                  onChange={() => toggleAllForModule(ct.name, action)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                        {collectionTypes.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              No collection types found. Create collection types in Content-Type Builder.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Single Types Tab */}
                {activeTab === 'single-types' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Create
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Read
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Update
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Delete
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Publish
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {singleTypes.map((st) => (
                          <tr key={st.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" className="w-4 h-4" />
                                <span>{st.displayName}</span>
                              </div>
                            </td>
                            {['create', 'read', 'update', 'delete', 'publish'].map((action) => (
                              <td key={action} className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={role.isSystem}
                                  checked={isPermissionChecked(st.name, action)}
                                  onChange={() => toggleAllForModule(st.name, action)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                        {singleTypes.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              No single types found. Create single types in Content-Type Builder.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Plugins Tab */}
                {activeTab === 'plugins' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Create
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Read
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Update
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Delete
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No plugins installed
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Module
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Create
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Read
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Update
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Delete
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Other
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {settingsModules.map((module) => {
                          const modulePerms = permissions[module.slug] || [];
                          const permsByAction: Record<string, Permission[]> = {
                            create: [],
                            read: [],
                            update: [],
                            delete: [],
                            other: [],
                          };

                          modulePerms.forEach((perm) => {
                            const action = perm.slug.split('.')[1] || 'other';
                            if (permsByAction[action]) {
                              permsByAction[action].push(perm);
                            } else {
                              permsByAction.other.push(perm);
                            }
                          });

                          return (
                            <tr key={module.slug} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {module.name}
                              </td>
                              {['create', 'read', 'update', 'delete', 'other'].map((action) => (
                                <td key={action} className="px-4 py-3 text-center">
                                  <div className="flex flex-col items-center space-y-1">
                                    {permsByAction[action].map((perm) => (
                                      <input
                                        key={perm.id}
                                        type="checkbox"
                                        disabled={role.isSystem}
                                        checked={formData.permissionIds.includes(perm.id)}
                                        onChange={() => togglePermission(perm.id)}
                                        title={perm.description || perm.name}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                      />
                                    ))}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
