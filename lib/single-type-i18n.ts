/**
 * Legacy Single Type i18n helpers.
 *
 * Single type content used to be stored inside `SingleType.data`, as a plain
 * payload for English or under an internal `__i18n` key for multiple languages.
 * Content now lives in a generated table (one row per language), but the legacy
 * payload is kept untouched so it can be imported exactly once by the storage
 * service and verified later.
 *
 * This module only reads the legacy shape. It never writes it.
 */

import { DEFAULT_LANGUAGE_CODE } from './i18n/languages';

export const SINGLE_TYPE_I18N_KEY = '__i18n';

export type LegacySingleTypeData = Record<string, Record<string, any>>;

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Remove internal bookkeeping keys from a legacy payload. */
function cleanContent(value: Record<string, any>): Record<string, any> {
  const content: Record<string, any> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === SINGLE_TYPE_I18N_KEY) continue;
    content[key] = entry;
  }
  return content;
}

/**
 * Normalize the legacy `SingleType.data` payload into a locale map.
 *
 * - plain object  -> `{ en: payload }`
 * - `{ __i18n }`  -> the stored locale map
 * - null/empty    -> `{}`
 */
export function extractLegacySingleTypeTranslations(
  data: unknown
): LegacySingleTypeData {
  if (!isPlainObject(data)) return {};

  const localized = (data as Record<string, any>)[SINGLE_TYPE_I18N_KEY];
  if (isPlainObject(localized)) {
    const translations: LegacySingleTypeData = {};
    for (const [locale, value] of Object.entries(localized)) {
      if (!locale || !isPlainObject(value)) continue;
      translations[locale.trim().toLowerCase()] = cleanContent(value);
    }
    return translations;
  }

  return {
    [DEFAULT_LANGUAGE_CODE]: cleanContent(data),
  };
}
