'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/admin/Layout';
import { DynamicForm } from '@/components/admin/DynamicForm';
import { LanguageSelect } from '@/components/admin/LanguageSelect';
import { useActiveLanguages } from '@/hooks/useActiveLanguages';
import { fetchTranslations } from '@/lib/content-i18n-client';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { fetchWithAuth } from '@/lib/api-client';

export default function EditCollectionEntry() {
  const router = useRouter();
  const params = useParams();
  const name = params?.name as string;
  const id = params?.id as string;

  const { languages } = useActiveLanguages();

  const [collectionType, setCollectionType] = useState<any>(null);
  const [entry, setEntry] = useState<any>(null);
  const [activeEntryId, setActiveEntryId] = useState(id);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<{ field: string; message: string } | null>(null);
  const [selectedLocale, setSelectedLocale] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem(`ssmed:locale:${name}`);
    return stored || 'en';
  });

  // Persist locale changes to localStorage so they survive page reloads.
  useEffect(() => {
    if (typeof window !== 'undefined' && name) {
      localStorage.setItem(`ssmed:locale:${name}`, selectedLocale);
    }
  }, [selectedLocale, name]);

  const [translationsByLocale, setTranslationsByLocale] = useState<Record<string, string>>({});
  // True when the selected locale has no existing translation for this rootId,
  // so saving should create a new translation instead of updating the current entry.
  const [isCreatingTranslation, setIsCreatingTranslation] = useState(false);

  useEffect(() => {
    if (name && id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, id]);

  const formatEntry = (rawEntry: any, fields: any[]): Record<string, any> => {
    const formattedEntry = { ...rawEntry };
    Object.keys(formattedEntry).forEach((key) => {
      const value = formattedEntry[key];
      const field = fields.find((f: any) => f.name === key);
      if (field && field.type === 'relation' && field.relation) {
        if (field.relation.type === 'manyToOne' || field.relation.type === 'oneToOne') {
          if (typeof value === 'object' && value !== null && value.id) {
            formattedEntry[key] = value.id;
          } else if (typeof value === 'string') {
            formattedEntry[key] = value;
          } else if (value === null || value === undefined) {
            formattedEntry[key] = null;
          }
        } else if (field.relation.type === 'manyToMany') {
          if (Array.isArray(value)) {
            formattedEntry[key] = value.map((item: any) => {
              if (typeof item === 'object' && item !== null && item.id) return item.id;
              return item;
            });
          } else {
            formattedEntry[key] = [];
          }
        } else if (field.relation.type === 'oneToMany') {
          // keep the populated array as-is for display
        }
      } else if (field && field.type === 'media') {
        if (field.multiple) {
          if (Array.isArray(value)) {
            formattedEntry[key] = JSON.stringify(value);
          } else if (typeof value === 'object' && value !== null) {
            formattedEntry[key] = JSON.stringify(value);
          } else if (typeof value === 'string') {
            formattedEntry[key] = value;
          }
        } else {
          if (typeof value === 'string') {
            formattedEntry[key] = value;
          }
        }
      } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          formattedEntry[key] = date.toISOString().split('T')[0];
        }
      }
    });
    return formattedEntry;
  };

  // Owning relations are shared by every translation of an entry. When a
  // translation does not exist yet, keep those values while the translatable
  // fields start empty.
  const seedSharedRelations = (
    sourceEntry: Record<string, any>,
    fields: any[]
  ): Record<string, any> => {
    const seeded: Record<string, any> = {};

    fields.forEach((field) => {
      if (field.type !== 'relation' || !field.relation) return;
      if (field.relation.isVirtual) return;
      if (
        field.relation.type !== 'manyToOne' &&
        field.relation.type !== 'oneToOne'
      ) {
        return;
      }

      const value = sourceEntry?.[field.name];
      if (value !== undefined && value !== null && value !== '') {
        seeded[field.name] = value;
      }
    });

    return seeded;
  };

  const loadEntry = async (entryId: string, knownFields?: any[]) => {
    setLoading(true);
    try {
      const entryRes = await fetchWithAuth(`/api/collections/${name}/${entryId}`);
      const entryData = await entryRes.json();
      const fields =
        knownFields || (collectionType?.fields as any)?.fields || [];
      setEntry(formatEntry(entryData.data, fields));
      setActiveEntryId(entryId);
      setIsCreatingTranslation(false);
    } catch (error) {
      console.error('Error loading entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typeRes, entryRes, translationData] = await Promise.all([
        fetchWithAuth(`/api/collection-types/${name}`),
        fetchWithAuth(`/api/collections/${name}/${id}`),
        fetchTranslations(name, id).catch(() => null),
      ]);

      const typeData = await typeRes.json();
      const entryData = await entryRes.json();

      console.log('[Edit Page] Fetched entry data:', entryData.data);
      console.log('[Edit Page] Entry locale:', entryData.data?.locale);

      setCollectionType(typeData.data);

      const translationsMap: Record<string, string> = {};
      if (translationData) {
        translationData.translations.forEach((translation) => {
          translationsMap[translation.locale] = translation.id;
        });
        setTranslationsByLocale(translationsMap);
        console.log('[Edit Page] Translations map:', translationsMap);
      }

      const fields = (typeData.data.fields as any)?.fields || [];
      const formattedEntry = formatEntry(entryData.data, fields);

      setEntry(formattedEntry);
      setActiveEntryId(id);
      setIsCreatingTranslation(false);

      // Honor the previously selected locale if a translation already exists
      // for it. Load that entry's data in place without navigating, so there
      // is no page reload and the dropdown stays on the chosen language.
      const existingId = translationsMap[selectedLocale];
      if (existingId && existingId !== id) {
        await loadEntry(existingId, fields);
      } else if (selectedLocale !== (entryData.data?.locale || 'en')) {
        // The selected language has no translation yet: prepare a new one and
        // keep the shared relations visible.
        setEntry(seedSharedRelations(formattedEntry, fields));
        setIsCreatingTranslation(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Record<string, any>) => {
    const toastId = toast.loading('Updating entry...');
    setServerError(null); // Clear previous errors
    
    try {
      console.log('[Edit Form] Original data:', data);
      
      // System fields that must never be sent from the client; the server owns them.
      const SYSTEM_FIELDS = new Set(['id', 'rootId', 'locale', 'createdAt', 'updatedAt']);

      // Get collection type fields to identify relation fields
      const fields = collectionType?.fields?.fields || [];
      
      const cleanedData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (SYSTEM_FIELDS.has(key)) return;
        const value = data[key];
        
        // Check if this is a relation field (not checking for 'Id' suffix anymore)
        const relationField = fields.find((f: any) => {
          if (f.type !== 'relation') return false;
          // Check if the key matches the field name exactly
          return f.name === key;
        });
        
        // For relation FK fields, explicitly set null if empty
        if (relationField && (value === '' || value === null || value === undefined)) {
          cleanedData[key] = null;
          console.log(`[Edit Form] Setting relation FK ${key} to null`);
        }
        // For other fields, only include non-empty values
        else if (value !== '' && value !== null && value !== undefined) {
          cleanedData[key] = value;
        }
      });
      
      console.log('[Edit Form] Cleaned data:', cleanedData);
      
      // When editing a locale that has no existing translation row, create a new
      // translation instead of updating the current entry.
      if (isCreatingTranslation) {
        const response = await fetchWithAuth(`/api/collections/${name}/${activeEntryId}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale: selectedLocale, data: cleanedData }),
        });

        if (response.ok) {
          const result = await response.json();
          toast.success('Translation created successfully!', { id: toastId });
          // Navigate to the newly created translation entry.
          router.push(`/admin/collections/${name}/${result.data.id}`);
        } else {
          const error = await response.json();
          const errorMessage = error.error || 'Failed to create translation';
          toast.error(errorMessage, { id: toastId });
        }
        return;
      }

      // Update existing entry
      const response = await fetchWithAuth(`/api/collections/${name}/${activeEntryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: cleanedData }),
      });

      if (response.ok) {
        toast.success('Entry updated successfully!', { id: toastId });
        router.push(`/admin/collections/${name}`);
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to update entry';
        
        // Check if error is about a unique field
        const uniqueFieldMatch = errorMessage.match(/This (.+?) already exists/);
        if (uniqueFieldMatch) {
          const fieldDisplayName = uniqueFieldMatch[1];
          const field = collectionType?.fields?.fields?.find(
            (f: any) => f.displayName === fieldDisplayName
          );
          
          if (field) {
            setServerError({
              field: field.name,
              message: errorMessage
            });
            toast.error('Please fix the errors below', { id: toastId });
            return;
          }
        }
        
        toast.error(errorMessage, { id: toastId });
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save entry', { id: toastId });
    }
  };

  const handlePublish = async () => {
    const toastId = toast.loading(entry.published ? 'Unpublishing...' : 'Publishing...');
    
    try {
      // Extract only the field data (exclude metadata)
      const fieldNames = collectionType.fields.fields.map((f: any) => f.name);
      const fieldData: Record<string, any> = {};
      fieldNames.forEach((fieldName: string) => {
        if (entry[fieldName] !== undefined) {
          fieldData[fieldName] = entry[fieldName];
        }
      });

      const response = await fetch(`/api/collections/${name}/${activeEntryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: fieldData, published: !entry.published }),
      });

      if (response.ok) {
        setEntry({ ...entry, published: !entry.published });
        toast.success(entry.published ? 'Entry unpublished!' : 'Entry published!', { id: toastId });
      } else {
        toast.error('Failed to update publish status', { id: toastId });
      }
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('Failed to update publish status', { id: toastId });
    }
  };

  const handleLanguageChange = async (code: string) => {
    console.log('[Edit Page] Language change requested:', code);
    console.log('[Edit Page] Current locale:', selectedLocale);

    if (code === selectedLocale) return;

    // Persist immediately (sync) before any navigation so the value survives page reload.
    if (typeof window !== 'undefined') {
      localStorage.setItem(`ssmed:locale:${name}`, code);
    }
    setSelectedLocale(code);

    // Load the translation for this locale directly via the API. The API resolves
    // the translation by rootId + locale, so we do not depend on translationsByLocale
    // being populated (fetchTranslations may have failed silently). No router.push,
    // so no page reload.
    setLoading(true);
    setIsCreatingTranslation(false);
    try {
      const entryRes = await fetchWithAuth(`/api/collections/${name}/${id}?locale=${code}`);
      const entryData = await entryRes.json();
      const fields = (collectionType.fields as any)?.fields || [];
      const loadedEntry = entryData.data;

      // If the API actually returned a translation for this locale, load its data.
      // Otherwise it fell back to the original entry -> no translation exists yet.
      if (loadedEntry && loadedEntry.locale === code) {
        setEntry(formatEntry(loadedEntry, fields));
        setActiveEntryId(loadedEntry.id);
      } else {
        // No translation exists yet for this locale. Clear the translatable
        // fields so the user can add new content, but keep shared relations
        // (e.g. the blog category) so they stay visible in every language.
        // Saving will create the translation automatically.
        const sourceEntry =
          entry || (loadedEntry ? formatEntry(loadedEntry, fields) : {});
        setEntry(seedSharedRelations(sourceEntry, fields));
        setActiveEntryId(id);
        setIsCreatingTranslation(true);
      }
    } catch (error) {
      console.error('Error loading translation:', error);
      setIsCreatingTranslation(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8">Loading...</div>
      </Layout>
    );
  }

  if (!collectionType || !entry) {
    return (
      <Layout>
        <div className="p-8">Entry not found</div>
      </Layout>
    );
  }

  console.log("fieldsfields", collectionType.fields.fields);

  return (
    <Layout>
      <div className="p-8">
        <Link
          href={`/admin/collections/${name}`}
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to {collectionType.displayName}</span>
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Edit {collectionType.displayName}
            </h1>
            {languages.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {languages
                  .filter((language) => translationsByLocale[language.code])
                  .map((language) => (
                    <span
                      key={language.code}
                      title={language.name}
                      className={`text-lg leading-none px-1 rounded ${
                        language.code === selectedLocale ? 'ring-2 ring-blue-400' : ''
                      }`}
                      aria-hidden
                    >
                      {language.flag || '🏳️'}
                    </span>
                  ))}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {languages.length > 0 && (
              <LanguageSelect
                languages={languages}
                value={selectedLocale}
                onChange={handleLanguageChange}
                translationCodes={Object.keys(translationsByLocale)}
                label="Language"
              />
            )}
            <button
              onClick={handlePublish}
              className={`px-4 py-2 rounded-lg ${
                entry.published
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {entry.published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <DynamicForm
            fields={collectionType.fields.fields}
            defaultValues={entry}
            onSubmit={handleSubmit}
            submitLabel="Update Entry"
            collectionName={name as string}
            entryId={activeEntryId}
            serverError={serverError}
          />
        </div>
      </div>
    </Layout>
  );
}
