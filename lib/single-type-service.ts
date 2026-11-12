/**
 * Database-driven Single Type storage.
 *
 * Every single type owns a generated PostgreSQL table whose physical columns
 * mirror its field definitions. Each language is a separate row:
 *
 *   id, rootId, locale, createdAt, updatedAt, ...content columns
 *
 * All rows of one single type share the same `rootId`; `(rootId, locale)` is
 * unique. English is created together with the table, and other languages are
 * created explicitly through `createSingleTypeTranslation`.
 *
 * `SingleType.data` is never written by this service. It is only read once to
 * import legacy content (including the old `__i18n` shape) into the generated
 * table.
 */

import { prisma } from './prisma';
import type { Field } from './types';
import {
  createDynamicTable,
  dropDynamicTable,
  ensureContentI18nSchema,
  sanitizeColumnName,
  sanitizeTableName,
  syncTableSchema,
  tableExists,
  validateSqlIdentifier,
  DEFAULT_CONTENT_LOCALE,
  I18N_LOCALE_COLUMN,
  I18N_ROOT_ID_COLUMN,
} from './dynamic-table-service';
import {
  createDynamic,
  findManyDynamic,
  updateDynamic,
} from './dynamic-prisma';
import {
  extractRelationId,
  getOwningRelationFields,
} from './i18n-relations';
import { extractLegacySingleTypeTranslations } from './single-type-i18n';

export interface SingleTypeRecord {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  fields: any;
  data?: any;
  tableName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SingleTypeSnapshot {
  tableName: string;
  row: Record<string, any> | null;
  data: Record<string, any> | null;
  locale: string;
  requestedLocale: string;
  availableLocales: string[];
}

export class SingleTypeStorageError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'SingleTypeStorageError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const SYSTEM_COLUMNS = new Set([
  'id',
  I18N_ROOT_ID_COLUMN,
  I18N_LOCALE_COLUMN,
  'createdAt',
  'updatedAt',
  // Columns from an older single-type translation design. They must never leak
  // into content payloads if a table still carries them.
  'translationGroupId',
  'lang',
  'localeStatus',
]);

/**
 * Tables owned by Prisma or the CMS itself. A generated single-type table can
 * never reuse these names.
 */
const RESERVED_TABLE_NAMES = new Set([
  'user',
  'role',
  'permission',
  'rolepermission',
  'session',
  'language',
  'collectiontype',
  'singletype',
  'component',
  'componententry',
  'media',
  'apitoken',
  'apitokenendpoint',
  'prisma_migrations',
  '_prisma_migrations',
]);

/**
 * Tables whose schema and English row have already been ensured in this
 * process. Field changes call `updateSingleTypeDefinition`, which re-syncs and
 * refreshes this cache.
 */
const ensuredSingleTypes = new Set<string>();

function getFields(record: SingleTypeRecord): Field[] {
  return (((record.fields as any)?.fields || []) as Field[]).filter(
    (field) => field && typeof field.name === 'string' && field.name.length > 0
  );
}

/**
 * Physical storage mapping:
 * - regular fields keep their type (components/media are JSONB)
 * - manyToOne / oneToOne own a TEXT foreign-key column
 * - manyToMany is stored as a JSONB array of ids (single types have no
 *   junction module)
 * - oneToMany is virtual and has no column
 */
function toStorageFields(fields: Field[]): Field[] {
  return fields.map((field) => {
    if (field.type === 'relation' && field.relation?.type === 'manyToMany') {
      return {
        ...field,
        type: 'json',
        relation: undefined,
      } as Field;
    }
    return field;
  });
}

function getSingleTypeTableName(record: SingleTypeRecord): string {
  return record.tableName || sanitizeTableName(record.name);
}

function normalizeName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

async function collectionTableNames(): Promise<Set<string>> {
  const collections = await prisma.collectionType.findMany({
    select: { name: true },
  });
  return new Set(collections.map((collection) => sanitizeTableName(collection.name)));
}

/**
 * Reject names owned by Prisma, another single type or a collection. Also
 * rejects a table that exists without a single type owning it, so a create can
 * never take over unrelated data.
 */
async function assertTableNameAvailable(
  tableName: string,
  excludeSingleTypeId?: string
): Promise<void> {
  if (!validateSqlIdentifier(tableName)) {
    throw new SingleTypeStorageError(
      400,
      'INVALID_TABLE_NAME',
      `"${tableName}" is not a valid database table name`
    );
  }

  if (RESERVED_TABLE_NAMES.has(tableName.toLowerCase())) {
    throw new SingleTypeStorageError(
      409,
      'RESERVED_TABLE_NAME',
      `"${tableName}" is reserved by the CMS`
    );
  }

  const collections = await collectionTableNames();
  if (collections.has(tableName)) {
    throw new SingleTypeStorageError(
      409,
      'TABLE_NAME_CONFLICT',
      `A collection already uses the table "${tableName}"`
    );
  }

  const singleTypes = await prisma.singleType.findMany({
    select: { id: true, name: true, tableName: true },
  });
  const conflict = singleTypes.find((singleType) => {
    if (excludeSingleTypeId && singleType.id === excludeSingleTypeId) return false;
    return (
      singleType.tableName === tableName ||
      sanitizeTableName(singleType.name) === tableName
    );
  });

  if (conflict) {
    throw new SingleTypeStorageError(
      409,
      'TABLE_NAME_CONFLICT',
      `Single type "${conflict.name}" already uses the table "${tableName}"`
    );
  }

  if (await tableExists(tableName)) {
    throw new SingleTypeStorageError(
      409,
      'TABLE_ALREADY_EXISTS',
      `Table "${tableName}" already exists`
    );
  }
}

/** Validate a language code against the active Language rows. */
export async function resolveSingleTypeLocale(
  locale?: string | string[] | null
): Promise<string> {
  const raw = Array.isArray(locale) ? locale[0] : locale;
  const code =
    String(raw || '').trim().toLowerCase() || DEFAULT_CONTENT_LOCALE;

  // English is the default language and is always available, even before the
  // language catalog has been synced.
  if (code === DEFAULT_CONTENT_LOCALE) return DEFAULT_CONTENT_LOCALE;

  const language = await prisma.language.findFirst({
    where: { code, isActive: true },
  });

  if (!language) {
    throw new SingleTypeStorageError(
      400,
      'INVALID_LOCALE',
      `Language "${code}" is not available or is not active`
    );
  }

  return language.code;
}

async function getAllRows(tableName: string): Promise<Record<string, any>[]> {
  const rows: any = await findManyDynamic(tableName, {});
  return Array.isArray(rows) ? rows : [];
}

async function findRowForLocale(
  tableName: string,
  locale: string
): Promise<Record<string, any> | null> {
  const rows: any = await findManyDynamic(tableName, {
    where: { [I18N_LOCALE_COLUMN]: locale },
  });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/** Physical row columns without the i18n/system bookkeeping columns. */
function contentOnlyStorage(
  row: Record<string, any> | null | undefined
): Record<string, any> {
  if (!row) return {};
  const content: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    if (SYSTEM_COLUMNS.has(key)) continue;
    content[key] = value;
  }
  return content;
}

/**
 * Map physical columns (sanitized, lower-case) back to the field names used by
 * the API and the Content Manager (for example `publishedat` -> `publishedAt`).
 */
function contentFromRow(
  row: Record<string, any> | null | undefined,
  fields: Field[]
): Record<string, any> {
  const storage = contentOnlyStorage(row);
  if (fields.length === 0) return storage;

  const fieldByColumn = new Map<string, string>();
  for (const field of fields) {
    const column = sanitizeColumnName(field.name);
    if (column && !fieldByColumn.has(column)) {
      fieldByColumn.set(column, field.name);
    }
  }

  const content: Record<string, any> = {};
  for (const [column, value] of Object.entries(storage)) {
    content[fieldByColumn.get(column) || column] = value;
  }
  return content;
}

function sortLocales(locales: string[]): string[] {
  return locales.sort((a, b) => {
    if (a === DEFAULT_CONTENT_LOCALE) return -1;
    if (b === DEFAULT_CONTENT_LOCALE) return 1;
    return a.localeCompare(b);
  });
}

async function getAvailableLocales(tableName: string): Promise<string[]> {
  const rows = await getAllRows(tableName);
  const locales = new Set<string>();
  for (const row of rows) {
    const locale = String(row[I18N_LOCALE_COLUMN] || '').trim().toLowerCase();
    if (locale) locales.add(locale);
  }
  return sortLocales(Array.from(locales));
}

/**
 * Convert API/Content Manager content (logical field names) into physical row
 * columns and normalize relation values.
 *
 * `undefined` means "leave unchanged" for updates, so it is omitted. Null is
 * preserved (it deliberately clears a value).
 */
function toStorageContent(
  fields: Field[],
  data: Record<string, any> | null | undefined
): Record<string, any> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};

  const normalized: Record<string, any> = {};
  for (const field of fields) {
    if (SYSTEM_COLUMNS.has(field.name)) continue;

    const column = sanitizeColumnName(field.name);
    if (!column || !validateSqlIdentifier(column)) continue;

    const hasLogicalName = Object.prototype.hasOwnProperty.call(
      data,
      field.name
    );
    const hasColumnName = Object.prototype.hasOwnProperty.call(data, column);
    if (!hasLogicalName && !hasColumnName) continue;

    const value = hasLogicalName ? data[field.name] : data[column];

    if (field.type === 'relation' && field.relation) {
      if (field.relation.type === 'oneToMany') continue;

      if (field.relation.type === 'manyToMany') {
        if (value === undefined) continue;
        const values = Array.isArray(value) ? value : value ? [value] : [];
        normalized[column] = values
          .map((entry) => extractRelationId(entry))
          .filter((entry): entry is string => Boolean(entry));
        continue;
      }

      if (value === undefined) continue;
      normalized[column] = extractRelationId(value);
      continue;
    }

    if (value !== undefined) normalized[column] = value;
  }

  return normalized;
}

function isUniqueViolation(error: any): boolean {
  return (
    error?.code === '23505' ||
    error?.code === 'P2002' ||
    /duplicate key value|unique constraint/i.test(String(error?.message || ''))
  );
}

/**
 * Import legacy `SingleType.data` into the generated table. Existing rows are
 * never overwritten; only missing languages are added. English is always
 * guaranteed to exist.
 */
async function migrateLegacyRows(
  record: SingleTypeRecord,
  tableName: string,
  initialData?: unknown
): Promise<void> {
  const fields = getFields(record);
  const legacy = extractLegacySingleTypeTranslations(
    initialData !== undefined ? initialData : record.data
  );
  let rows = await getAllRows(tableName);

  if (rows.length === 0) {
    const seed = toStorageContent(
      fields,
      legacy[DEFAULT_CONTENT_LOCALE] || {}
    );
    const english = await createDynamic(tableName, {
      ...seed,
      [I18N_LOCALE_COLUMN]: DEFAULT_CONTENT_LOCALE,
    });
    const rootId = english?.[I18N_ROOT_ID_COLUMN] || english?.id;
    rows = [english];

    for (const [locale, content] of Object.entries(legacy)) {
      if (locale === DEFAULT_CONTENT_LOCALE) continue;
      const created = await createDynamic(
        tableName,
        {
          ...toStorageContent(fields, content),
          [I18N_ROOT_ID_COLUMN]: rootId,
          [I18N_LOCALE_COLUMN]: locale,
        },
        { allowReservedI18n: true }
      );
      rows.push(created);
    }

    if (Object.keys(legacy).length === 0) return;
  }

  const english =
    rows.find((row) => row[I18N_LOCALE_COLUMN] === DEFAULT_CONTENT_LOCALE) ||
    null;
  const rootId =
    english?.[I18N_ROOT_ID_COLUMN] ||
    rows[0]?.[I18N_ROOT_ID_COLUMN] ||
    rows[0]?.id;

  if (!english) {
    const legacyEnglish = legacy[DEFAULT_CONTENT_LOCALE];
    const seed =
      legacyEnglish !== undefined
        ? toStorageContent(fields, legacyEnglish)
        : contentOnlyStorage(rows[0]);
    const created = await createDynamic(
      tableName,
      {
        ...seed,
        [I18N_ROOT_ID_COLUMN]: rootId,
        [I18N_LOCALE_COLUMN]: DEFAULT_CONTENT_LOCALE,
      },
      { allowReservedI18n: true }
    );
    rows.push(created);
  }

  const existingLocales = new Set(
    rows.map((row) =>
      String(row[I18N_LOCALE_COLUMN] || '').trim().toLowerCase()
    )
  );

  for (const [locale, content] of Object.entries(legacy)) {
    if (existingLocales.has(locale)) continue;
    try {
      await createDynamic(
        tableName,
        {
          ...toStorageContent(fields, content),
          [I18N_ROOT_ID_COLUMN]: rootId,
          [I18N_LOCALE_COLUMN]: locale,
        },
        { allowReservedI18n: true }
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
}

/**
 * Idempotently create/repair a single type's generated table and six system
 * columns, then import legacy content.
 */
export async function ensureSingleTypeStorage(
  record: SingleTypeRecord,
  options: { forceSync?: boolean; initialData?: unknown } = {}
): Promise<{ record: SingleTypeRecord; tableName: string; fields: Field[] }> {
  let current = record;
  let tableName = getSingleTypeTableName(current);

  if (!current.tableName) {
    // The caller may hold a record loaded before a previous ensure assigned the
    // table name (for example a script or a long-lived request). Re-read it
    // before treating the name as unassigned.
    const fresh = (await prisma.singleType.findUnique({
      where: { id: current.id },
    })) as SingleTypeRecord | null;

    if (fresh?.tableName) {
      current = fresh;
      tableName = fresh.tableName;
    } else {
      await assertTableNameAvailable(tableName, current.id);
      current = await prisma.singleType.update({
        where: { id: current.id },
        data: { tableName },
      });
    }
  } else {
    tableName = current.tableName;
  }

  if (!validateSqlIdentifier(tableName)) {
    throw new SingleTypeStorageError(
      400,
      'INVALID_TABLE_NAME',
      `"${tableName}" is not a valid database table name`
    );
  }

  const fields = getFields(current);
  const storageFields = toStorageFields(fields);
  const exists = await tableExists(tableName);

  if (!exists) {
    await createDynamicTable(tableName, storageFields);
  }

  if (!exists || options.forceSync || !ensuredSingleTypes.has(tableName)) {
    await syncTableSchema(tableName, storageFields);
  }

  await ensureContentI18nSchema(tableName);
  await migrateLegacyRows(current, tableName, options.initialData);

  ensuredSingleTypes.add(tableName);
  return { record: current, tableName, fields };
}

/** Create the definition, its generated table and the initial English row. */
export async function createSingleTypeDefinition(input: {
  name: string;
  displayName: string;
  description?: string | null;
  fields: any;
  initialData?: unknown;
}): Promise<SingleTypeRecord> {
  const name = normalizeName(input.name);
  if (!name) {
    throw new SingleTypeStorageError(400, 'INVALID_NAME', 'A name is required');
  }

  const tableName = sanitizeTableName(name);
  await assertTableNameAvailable(tableName);

  let created: SingleTypeRecord | null = null;
  try {
    created = await prisma.singleType.create({
      data: {
        name,
        displayName: input.displayName,
        description: input.description ?? null,
        fields: input.fields,
        tableName,
      } as any,
    });

    await ensureSingleTypeStorage(created, {
      initialData: input.initialData,
    });

    const refreshed = await prisma.singleType.findUnique({
      where: { id: created.id },
    });
    return (refreshed || created) as SingleTypeRecord;
  } catch (error: any) {
    if (created) {
      try {
        await dropDynamicTable(tableName);
      } catch (cleanupError) {
        console.error(
          '[Single Types] Could not remove table during rollback:',
          cleanupError
        );
      }
      try {
        await prisma.singleType.delete({ where: { id: created.id } });
      } catch (cleanupError) {
        console.error(
          '[Single Types] Could not remove definition during rollback:',
          cleanupError
        );
      }
    }

    if (isUniqueViolation(error)) {
      throw new SingleTypeStorageError(
        409,
        'SINGLE_TYPE_EXISTS',
        `Single type "${name}" already exists`
      );
    }
    throw error;
  }
}

/** Update definition metadata and synchronize the generated table schema. */
export async function updateSingleTypeDefinition(
  record: SingleTypeRecord,
  input: {
    displayName?: string;
    description?: string | null;
    fields?: any;
  }
): Promise<SingleTypeRecord> {
  const current = await ensureSingleTypeStorage(record);
  const nextFields = input.fields !== undefined ? input.fields : current.record.fields;

  const updateData: Record<string, any> = {};
  if (input.displayName !== undefined) updateData.displayName = input.displayName;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.fields !== undefined) updateData.fields = input.fields;

  const updated =
    Object.keys(updateData).length > 0
      ? ((await prisma.singleType.update({
          where: { id: current.record.id },
          data: updateData,
        })) as SingleTypeRecord)
      : current.record;

  if (input.fields !== undefined) {
    const fields = (((nextFields as any)?.fields || []) as Field[]);
    await syncTableSchema(current.tableName, toStorageFields(fields));
    ensuredSingleTypes.add(current.tableName);
  }

  return updated;
}

/**
 * Read the content row for a language. Admin reads are strict (no fallback);
 * public reads may fall back to English.
 */
export async function getSingleTypeSnapshot(
  record: SingleTypeRecord,
  locale: string,
  options: { fallbackToDefault?: boolean } = {}
): Promise<SingleTypeSnapshot> {
  const { tableName, fields } = await ensureSingleTypeStorage(record);
  const requestedLocale = await resolveSingleTypeLocale(locale);
  const availableLocales = await getAvailableLocales(tableName);

  let row = await findRowForLocale(tableName, requestedLocale);
  let resolvedLocale = requestedLocale;

  if (
    !row &&
    options.fallbackToDefault &&
    requestedLocale !== DEFAULT_CONTENT_LOCALE
  ) {
    row = await findRowForLocale(tableName, DEFAULT_CONTENT_LOCALE);
    if (row) resolvedLocale = DEFAULT_CONTENT_LOCALE;
  }

  return {
    tableName,
    row,
    data: row ? contentFromRow(row, fields) : null,
    locale: resolvedLocale,
    requestedLocale,
    availableLocales,
  };
}

/** Update one language's row. Missing translations must be created explicitly. */
export async function updateSingleTypeContent(
  record: SingleTypeRecord,
  locale: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  const { tableName, fields } = await ensureSingleTypeStorage(record);
  const resolvedLocale = await resolveSingleTypeLocale(locale);
  const row = await findRowForLocale(tableName, resolvedLocale);

  if (!row) {
    throw new SingleTypeStorageError(
      404,
      'TRANSLATION_NOT_FOUND',
      `No "${resolvedLocale}" translation exists yet. Create it first.`
    );
  }

  const normalized = toStorageContent(fields, data);

  if (Object.keys(normalized).length === 0) {
    const result: any = await prisma.$queryRawUnsafe(
      `UPDATE "${tableName}" SET "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
      row.id
    );
    return Array.isArray(result) ? result[0] : row;
  }

  return updateDynamic(tableName, row.id, normalized);
}

/**
 * Explicitly create a translation. The new row shares the source `rootId`,
 * receives a new primary id, and starts as a copy of the source content.
 * Owning relations (manyToOne/oneToOne) stay independent per language.
 */
export async function createSingleTypeTranslation(
  record: SingleTypeRecord,
  targetLocale: string,
  overrides: Record<string, any> = {}
): Promise<Record<string, any>> {
  const { tableName, fields } = await ensureSingleTypeStorage(record);
  const locale = await resolveSingleTypeLocale(targetLocale);
  const rows = await getAllRows(tableName);

  const source =
    rows.find((row) => row[I18N_LOCALE_COLUMN] === DEFAULT_CONTENT_LOCALE) ||
    rows[0] ||
    null;

  if (!source) {
    throw new SingleTypeStorageError(
      404,
      'SINGLE_TYPE_EMPTY',
      'This single type has no content row to translate'
    );
  }

  if (rows.some((row) => row[I18N_LOCALE_COLUMN] === locale)) {
    throw new SingleTypeStorageError(
      409,
      'TRANSLATION_EXISTS',
      `A "${locale}" translation already exists`
    );
  }

  const rootId = source[I18N_ROOT_ID_COLUMN] || source.id;
  const owningColumns = new Set(
    getOwningRelationFields(fields)
      .map((field) => sanitizeColumnName(field.name))
      .filter((column) => Boolean(column))
  );
  const normalizedOverrides = toStorageContent(fields, overrides);

  const clone: Record<string, any> = {};
  for (const [column, value] of Object.entries(contentOnlyStorage(source))) {
    if (owningColumns.has(column)) continue;
    clone[column] = value;
  }
  Object.assign(clone, normalizedOverrides);

  // Never inherit an owning relation from another language.
  for (const column of Array.from(owningColumns)) {
    if (!Object.prototype.hasOwnProperty.call(normalizedOverrides, column)) {
      clone[column] = null;
    }
  }

  clone[I18N_ROOT_ID_COLUMN] = rootId;
  clone[I18N_LOCALE_COLUMN] = locale;

  try {
    return await createDynamic(tableName, clone, {
      allowReservedI18n: true,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SingleTypeStorageError(
        409,
        'TRANSLATION_EXISTS',
        `A "${locale}" translation already exists`
      );
    }
    throw error;
  }
}

/** Drop the generated table and delete the definition. */
export async function deleteSingleTypeDefinition(
  record: SingleTypeRecord
): Promise<void> {
  const tableName = getSingleTypeTableName(record);
  const collections = await collectionTableNames();

  if (collections.has(tableName)) {
    throw new SingleTypeStorageError(
      409,
      'TABLE_NAME_CONFLICT',
      `Table "${tableName}" belongs to a collection and cannot be dropped`
    );
  }

  if (validateSqlIdentifier(tableName) && (await tableExists(tableName))) {
    await dropDynamicTable(tableName);
  }

  await prisma.singleType.delete({ where: { id: record.id } });
  ensuredSingleTypes.delete(tableName);
}

/** Backfill every existing single type. Used by the migration script. */
export async function migrateAllSingleTypes(): Promise<
  Array<{
    name: string;
    tableName: string;
    availableLocales: string[];
    rowCount: number;
  }>
> {
  const records = (await prisma.singleType.findMany({
    orderBy: { createdAt: 'asc' },
  })) as SingleTypeRecord[];

  const results: Array<{
    name: string;
    tableName: string;
    availableLocales: string[];
    rowCount: number;
  }> = [];

  for (const record of records) {
    const { tableName } = await ensureSingleTypeStorage(record);
    const rows = await getAllRows(tableName);
    results.push({
      name: record.name,
      tableName,
      availableLocales: await getAvailableLocales(tableName),
      rowCount: rows.length,
    });
  }

  return results;
}
