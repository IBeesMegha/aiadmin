'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { DynamicForm } from '@/components/admin/DynamicForm';
import { LanguageSelect } from '@/components/admin/LanguageSelect';
import { useActiveLanguages } from '@/hooks/useActiveLanguages';
import { useRouter, useParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api-client';
import toast from 'react-hot-toast';

const DEFAULT_LOCALE = 'en';

export default function SingleTypeEdit() {
  const router = useRouter();
  const params = useParams();
  const name = params?.name as string;

  const { languages, loading: languagesLoading } = useActiveLanguages();

  const [singleType, setSingleType] = useState<any>(null);
  const [entryData, setEntryData] = useState<Record<string, any>>({});
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [selectedLocale, setSelectedLocale] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    const stored = localStorage.getItem(`ssmed:single-locale:${name}`);
    return stored || DEFAULT_LOCALE;
  });
  const [isNewTranslation, setIsNewTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Persist the selected language per single type so it survives reloads, just
  // like the collection Content Manager does.
  useEffect(() => {
    if (typeof window !== 'undefined' && name) {
      localStorage.setItem(`ssmed:single-locale:${name}`, selectedLocale);
    }
  }, [selectedLocale, name]);

  const formatEntry = (rawEntry: any, fields: any[]): Record<string, any> => {
    const formattedEntry = { ...rawEntry };
    Object.keys(formattedEntry).forEach((key) => {
      const value = formattedEntry[key];
      const field = fields.find((f: any) => f.name === key);

      if (field && field.type === 'relation' && field.relation) {
        if (
          field.relation.type === 'manyToOne' ||
          field.relation.type === 'oneToOne'
        ) {
          if (typeof value === 'object' && value !== null && value.id) {
            formattedEntry[key] = value.id;
          }
        } else if (field.relation.type === 'manyToMany') {
          formattedEntry[key] = Array.isArray(value)
            ? value.map((item: any) =>
                typeof item === 'object' && item !== null && item.id
                  ? item.id
                  : item
              )
            : [];
        }
      } else if (field && field.type === 'media' && field.multiple) {
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          formattedEntry[key] = JSON.stringify(value);
        }
      } else if (
        value instanceof Date ||
        (typeof value === 'string' && !isNaN(Date.parse(value)))
      ) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          formattedEntry[key] = date.toISOString().split('T')[0];
        }
      }
    });
    return formattedEntry;
  };

  const loadSingleType = useCallback(
    async (locale: string) => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(
          `/api/single-types/${name}?includeMeta=true&locale=${encodeURIComponent(locale)}`
        );
        const result = await response.json();

        if (!response.ok || !result.data) {
          setSingleType(null);
          return;
        }

        const record = result.data;
        const fields = record.fields?.fields || [];
        const locales: string[] = Array.isArray(record.availableLocales)
          ? record.availableLocales
          : [];
        const localeData =
          record.data && typeof record.data === 'object' ? record.data : null;
        const hasTranslation = locales.includes(locale);

        setSingleType(record);
        setAvailableLocales(locales);

        if (hasTranslation) {
          setEntryData(formatEntry(localeData || {}, fields));
          setIsNewTranslation(false);
        } else {
          // No content in this language: start from an empty form. Saving will
          // explicitly create that language's row without touching others.
          setEntryData({});
          setIsNewTranslation(true);
        }
      } catch (error) {
        console.error('[SingleTypeEdit] Error fetching single type:', error);
        setSingleType(null);
      } finally {
        setLoading(false);
      }
    },
    [name]
  );

  useEffect(() => {
    if (!name || languagesLoading) return;

    // A stored locale can become inactive or stale; fall back to the default
    // language instead of showing content for a language we cannot use.
    if (
      languages.length > 0 &&
      !languages.some((language) => language.code === selectedLocale)
    ) {
      const fallback =
        languages.find((language) => language.isDefault)?.code ||
        languages[0].code;
      setSelectedLocale(fallback);
      return;
    }

    loadSingleType(selectedLocale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, selectedLocale, languages, languagesLoading]);

  const handleLanguageChange = (code: string) => {
    if (code === selectedLocale) return;
    setSelectedLocale(code);
  };

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSaving(true);
    const toastId = toast.loading(
      isNewTranslation ? 'Creating translation...' : 'Saving...'
    );

    const createTranslation = () =>
      fetchWithAuth(`/api/single-types/${name}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, locale: selectedLocale }),
      });

    try {
      let response = isNewTranslation
        ? await createTranslation()
        : await fetchWithAuth(`/api/single-types/${name}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, locale: selectedLocale }),
          });

      let error = await response.clone().json().catch(() => ({}));

      // The translation may have been created in another tab between loading
      // the page and saving. Switch to the explicit create endpoint once.
      if (
        !response.ok &&
        !isNewTranslation &&
        (response.status === 404 ||
          error?.code === 'TRANSLATION_NOT_FOUND')
      ) {
        response = await createTranslation();
        error = await response.clone().json().catch(() => ({}));
      }

      if (response.ok) {
        toast.success(
          isNewTranslation
            ? 'Translation created successfully!'
            : 'Single type updated successfully!',
          { id: toastId }
        );
        await loadSingleType(selectedLocale);
      } else {
        toast.error(error.error || 'Failed to save single type', { id: toastId });
      }
    } catch (error) {
      console.error('Error saving single type:', error);
      toast.error('Failed to save single type', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">Loading...</div>
      </Layout>
    );
  }

  if (!singleType) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Single type not found
            </h2>
            <p className="text-red-700 mb-4">
              The single type &quot;{name}&quot; could not be found. Please check:
            </p>
            <ul className="list-disc list-inside text-red-700 space-y-1 mb-4">
              <li>The single type exists in the database</li>
              <li>The name is spelled correctly</li>
              <li>The API is running properly</li>
            </ul>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin/content-type-builder/single-types')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Back to Single Types
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentLanguage = languages.find(
    (language) => language.code === selectedLocale
  );
  const currentLanguageName = currentLanguage?.name || selectedLocale;

  return (
    <Layout>
      <div className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {singleType.displayName}
            </h1>
            {singleType.description && (
              <p className="text-gray-600 mt-2">{singleType.description}</p>
            )}
            {languages.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {languages.map((language) => {
                  const hasTranslation = availableLocales.includes(language.code);
                  return (
                    <span
                      key={language.code}
                      title={
                        hasTranslation
                          ? language.name
                          : `${language.name} (no translation yet)`
                      }
                      className={`text-lg leading-none px-1 rounded ${
                        language.code === selectedLocale ? 'ring-2 ring-blue-400' : ''
                      } ${hasTranslation ? '' : 'opacity-30 grayscale'}`}
                      aria-hidden
                    >
                      {language.flag || '🏳️'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {languages.length > 0 && (
            <LanguageSelect
              languages={languages}
              value={selectedLocale}
              onChange={handleLanguageChange}
              translationCodes={availableLocales}
              label="Language"
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {isNewTranslation && languages.length > 0 && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No translation exists for {currentLanguageName}. Fill in the fields
              and click &quot;Create Translation&quot;. Existing translations are
              kept as they are.
            </div>
          )}

          {singleType.fields && singleType.fields.fields && singleType.fields.fields.length > 0 ? (
            <DynamicForm
              fields={singleType.fields.fields}
              defaultValues={entryData}
              onSubmit={handleSubmit}
              submitLabel={isNewTranslation ? 'Create Translation' : 'Save'}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No fields defined for this single type.</p>
              <button
                onClick={() => router.push(`/admin/content-type-builder?type=single&edit=${name}`)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Fields
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
