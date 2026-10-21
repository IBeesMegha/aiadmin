/**
 * Content Internationalization - client helpers
 *
 * Thin wrappers around the existing collection + language CRUD APIs that the
 * Content Manager UI uses to list languages, list an entry's translations and
 * create a new translation. All requests go through `fetchWithAuth` so token
 * refresh keeps working exactly like the rest of the admin app.
 */

import { fetchWithAuth } from '@/lib/api-client';

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  flag?: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface TranslationList {
  rootId: string;
  translations: Record<string, any>[];
}

/** Load every language and keep only the active ones, default language first. */
export async function fetchActiveLanguages(): Promise<Language[]> {
  const response = await fetchWithAuth('/api/languages');
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to load languages');
  }

  const languages: Language[] = result.data?.languages || [];

  return languages
    .filter((language) => language.isActive)
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** List every translation that belongs to the same group as `entryId`. */
export async function fetchTranslations(
  collectionName: string,
  entryId: string
): Promise<TranslationList> {
  const response = await fetchWithAuth(
    `/api/collections/${collectionName}/${entryId}/translate`
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to load translations');
  }

  return {
    rootId: result.rootId,
    translations: result.data || [],
  };
}

/** Create a translation of `entryId` in `locale` (server clones the content). */
export async function createEntryTranslation(
  collectionName: string,
  entryId: string,
  locale: string,
  data?: Record<string, any>
): Promise<Record<string, any>> {
  const response = await fetchWithAuth(
    `/api/collections/${collectionName}/${entryId}/translate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, data }),
    }
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create translation');
  }

  return result.data;
}
