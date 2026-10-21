'use client';

/**
 * Internationalization Settings Page
 * /admin/settings/internationalization
 *
 * Lists the languages available in the CMS and lets admins activate or
 * deactivate them. English is the default language and can never be
 * deactivated. Deactivating a language only hides it from content editing;
 * it never deletes existing content.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/admin/Layout';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Globe,
  Search,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  flag: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function StatusToggle({
  enabled,
  disabled,
  onChange,
  title,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={title}
      aria-pressed={enabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function InternationalizationPage() {
  const { hasPermission, loading: authLoading } = useAuth();
  const router = useRouter();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const canManage = hasPermission('internationalization.manage');

  const fetchLanguages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/languages', { credentials: 'include' });
      const result = await response.json();

      if (response.ok && result.success) {
        setLanguages(result.data.languages);
      } else {
        toast.error(result.error || 'Failed to load languages');
      }
    } catch (error) {
      console.error('Failed to fetch languages:', error);
      toast.error('Failed to load languages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!hasPermission('internationalization.read')) {
      router.push('/admin/403');
      return;
    }
    fetchLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, hasPermission]);

  const handleToggle = async (language: Language, nextActive: boolean) => {
    if (language.isDefault && !nextActive) {
      toast.error('English (default) cannot be deactivated');
      return;
    }

    setUpdatingId(language.id);
    try {
      const response = await fetch(`/api/languages/${language.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: nextActive }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setLanguages((prev) =>
          prev.map((item) => (item.id === language.id ? result.data.language : item))
        );
        toast.success(result.message || 'Language updated');
      } else {
        toast.error(result.error || 'Failed to update language');
      }
    } catch (error) {
      console.error('Failed to update language:', error);
      toast.error('Failed to update language');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return languages;
    return languages.filter(
      (language) =>
        language.name.toLowerCase().includes(term) ||
        language.code.toLowerCase().includes(term) ||
        (language.nativeName || '').toLowerCase().includes(term)
    );
  }, [languages, search]);

  const activeCount = languages.filter((language) => language.isActive).length;

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Internationalization</h1>
            <p className="text-gray-600 mt-2">
              Manage the languages available for your content.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-medium">
              <CheckCircle2 size={16} />
              {activeCount} active
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
              <Globe size={16} />
              {languages.length} total
            </span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              English is the default language and is always active. It cannot be
              deactivated.
            </p>
            <p>
              Deactivating a language only hides it while editing content. It never
              deletes existing content, so you can safely deactivate and re-activate
              languages at any time.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search languages..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Languages Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Native Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((language) => {
                  const isUpdating = updatingId === language.id;
                  const toggleDisabled = !canManage || language.isDefault || isUpdating;

                  return (
                    <tr key={language.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl leading-none" aria-hidden>
                            {language.flag || '🏳️'}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-2">
                              {language.name}
                              {language.isDefault && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
                                  <Lock size={10} />
                                  Default
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                          {language.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {language.nativeName || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            language.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {language.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          {isUpdating && (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          )}
                          <StatusToggle
                            enabled={language.isActive}
                            disabled={toggleDisabled}
                            onChange={() => handleToggle(language, !language.isActive)}
                            title={
                              language.isDefault
                                ? 'The default language cannot be deactivated'
                                : !canManage
                                ? 'You do not have permission to manage languages'
                                : language.isActive
                                ? 'Deactivate language'
                                : 'Activate language'
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No languages found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search ? 'Try a different search term.' : 'No languages are available.'}
              </p>
            </div>
          )}
        </div>

        {!canManage && (
          <p className="mt-4 text-sm text-gray-500">
            You have read-only access to internationalization settings.
          </p>
        )}
      </div>
    </Layout>
  );
}
