/**
 * Content Internationalization
 *
 * Internationalization for dynamically-stored collection entries:
 *   - every entry carries a `locale` (language code, default "en")
 *   - every entry carries a `rootId` shared by all translations of the entry
 *   - translations are separate rows with their own primary id and the same
 *     `rootId`
 *   - a content type may hold at most one row per (`rootId`, `locale`) pair
 *
 * The physical columns live on the runtime dynamic tables (raw SQL). This
 * module is the single place that understands the i18n semantics so the
 * relation, media, component and validation behaviour of the collection APIs
 * stays exactly where it was.
 */

import { prisma } from './prisma';
import {
  ensureContentI18nSchema,
  DEFAULT_CONTENT_LOCALE,
} from './dynamic-table-service';
import {
  findManyDynamic,
  findUniqueDynamic,
  createDynamic,
} from './dynamic-prisma';

/** Error carrying an HTTP status code so API handlers can map it directly. */
export class ContentI18nError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ContentI18nError';
    this.statusCode = statusCode;
  }
}

/**
 * Logical i18n columns are owned by the i18n layer. They can never be set or
 * overwritten from user supplied payloads.
 */
const RESERVED_COLUMNS = new Set(['id', 'createdAt', 'updatedAt', 'rootId', 'locale']);

export interface ActiveLanguage {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
}

/**
 * Validate that `code` refers to an existing, active language.
 * Throws ContentI18nError(400) when the language is unknown or inactive.
 */
export async function getActiveLanguage(code: string): Promise<ActiveLanguage> {
  const normalized = String(code || '').trim().toLowerCase();

  if (!normalized) {
    throw new ContentI18nError(400, 'A target language code is required');
  }

  const language = await prisma.language.findFirst({
    where: { code: normalized, isActive: true },
  });

  if (!language) {
    throw new ContentI18nError(
      400,
      `Language "${normalized}" is not available or is not active`
    );
  }

  return language as ActiveLanguage;
}

/**
 * Load an entry from its dynamic table. Throws 404 when it does not exist.
 */
async function resolveEntry(
  collectionName: string,
  entryId: string
): Promise<Record<string, any>> {
  await ensureContentI18nSchema(collectionName);

  const rows: any = await findUniqueDynamic(collectionName, entryId);
  const entry = Array.isArray(rows) ? rows[0] : rows;

  if (!entry) {
    throw new ContentI18nError(404, 'Entry not found');
  }

  return entry;
}

/**
 * Resolve the rootId of an entry. Existing entries that predate the i18n
 * columns are backfilled to `rootId = id` by `ensureContentI18nSchema`, so this
 * only needs to fall back to the entry id defensively.
 */
async function resolveRootId(
  _collectionName: string,
  entry: Record<string, any>
): Promise<string> {
  return (entry.rootId as string) || (entry.id as string);
}

/**
 * All translations that belong to the same translation group as `entryId`
 * (including the entry itself), English first.
 */
export async function listTranslations(
  collectionName: string,
  entryId: string
): Promise<{ rootId: string; translations: Record<string, any>[] }> {
  const entry = await resolveEntry(collectionName, entryId);
  const rootId = await resolveRootId(collectionName, entry);

  const rows: any = await findManyDynamic(collectionName, { where: { rootId } });
  const translations: Record<string, any>[] = Array.isArray(rows) ? rows : [];

  translations.sort((a, b) => {
    if (a.locale === DEFAULT_CONTENT_LOCALE) return -1;
    if (b.locale === DEFAULT_CONTENT_LOCALE) return 1;
    return String(a.locale).localeCompare(String(b.locale));
  });

  return { rootId, translations };
}

/**
 * Create a translation of an existing entry.
 *
 * - the target language must be active (validated against the Language model)
 * - the new row keeps the source `rootId` but receives a brand new primary id
 * - content (regular fields, relations, media, components, drafts) is cloned
 *   so the translation starts from the source and can then be edited
 * - duplicate (rootId, locale) pairs are rejected with 409
 *
 * `overrides` lets the caller supply translated field values up-front; the
 * reserved i18n columns are always ignored from user input.
 */
export async function createTranslation(
  collectionName: string,
  sourceId: string,
  targetLocale: string,
  overrides: Record<string, any> = {}
): Promise<Record<string, any>> {
  const source = await resolveEntry(collectionName, sourceId);

  const language = await getActiveLanguage(targetLocale);
  const locale = language.code;
  const rootId = await resolveRootId(collectionName, source);

  const existing: any = await findManyDynamic(collectionName, {
    where: { rootId, locale },
  });

  if (Array.isArray(existing) && existing.length > 0) {
    throw new ContentI18nError(
      409,
      `A "${locale}" translation already exists for this entry`
    );
  }

  const clone: Record<string, any> = {};
  for (const [key, value] of Object.entries(source)) {
    if (RESERVED_COLUMNS.has(key)) continue;
    clone[key] = value;
  }
  for (const [key, value] of Object.entries(overrides || {})) {
    if (RESERVED_COLUMNS.has(key)) continue;
    clone[key] = value;
  }

  clone.rootId = rootId;
  clone.locale = locale;

  // Only the i18n layer is allowed to set the reserved rootId/locale columns.
  return createDynamic(collectionName, clone, { allowReservedI18n: true });
}

/**
 * Resolve and validate the requested content locale from an API query object.
 *
 * - omits / empty → falls back to the default content locale ("en")
 * - otherwise validates the code against the active `Language` rows
 *
 * Returns the normalized, active language code. Throws ContentI18nError(400)
 * when the requested locale is unknown or inactive, so inactive-language
 * content can never be requested through public queries.
 */
export async function resolveRequestLocale(
  query: Record<string, unknown>,
  defaultCode: string = DEFAULT_CONTENT_LOCALE
): Promise<string> {
  const raw = query?.locale;
  const code =
    raw === undefined || raw === null || raw === ''
      ? defaultCode
      : String(raw).trim();

  const language = await getActiveLanguage(code);
  return language.code;
}
