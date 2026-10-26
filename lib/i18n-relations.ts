/**
 * Internationalized relations
 *
 * Translation rows of the same entry share a `rootId`. Owning relations
 * (`manyToOne` / `oneToOne`, for example a category) are stored as a foreign
 * key on every translation row and are independent per language: selecting a
 * category for one language never changes another language.
 *
 * The helpers in this module resolve relations through translation groups:
 * a stored id is mapped to the related entry's translation for the requested
 * language (falling back to the default language).
 */

import { findManyDynamic, findUniqueDynamic } from './dynamic-prisma';
import { DEFAULT_CONTENT_LOCALE } from './dynamic-table-service';
import type { Field } from './types';

/** Relations that own a physical foreign key column on the row. */
export function isOwningRelationField(field: Field): boolean {
  if (!field || field.type !== 'relation' || !field.relation) return false;
  if (field.relation.isVirtual) return false;
  return field.relation.type === 'manyToOne' || field.relation.type === 'oneToOne';
}

export function getOwningRelationFields(fields: Field[]): Field[] {
  return (fields || []).filter(isOwningRelationField);
}

function isEmptyRelation(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** Relation values may arrive as an id, or as a populated `{ id }` object. */
export function extractRelationId(value: unknown): string | null {
  if (isEmptyRelation(value)) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && (value as any).id) {
    return String((value as any).id);
  }
  return String(value);
}

function normalizeLocale(locale?: string | null): string {
  const normalized = String(locale || '').trim().toLowerCase();
  return normalized || DEFAULT_CONTENT_LOCALE;
}

function orderByLocale(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.slice().sort((a, b) => {
    const aDefault = a.locale === DEFAULT_CONTENT_LOCALE;
    const bDefault = b.locale === DEFAULT_CONTENT_LOCALE;
    if (aDefault && !bDefault) return -1;
    if (bDefault && !aDefault) return 1;
    return String(a.locale).localeCompare(String(b.locale));
  });
}

async function findRowByRoot(
  collectionName: string,
  rootId: string
): Promise<Record<string, any>[]> {
  const rows: any = await findManyDynamic(collectionName, { where: { rootId } });
  return Array.isArray(rows) ? rows : [];
}

/**
 * Resolve the translation group root of a related entry.
 *
 * Accepts either a primary entry id or a root id. When the id is not found as
 * a primary key it is treated as a root id, which keeps older data (where a
 * root id may have been stored as the relation value) working.
 */
export async function resolveRelationRootId(
  targetCollection: string,
  relationId: string
): Promise<string | null> {
  if (isEmptyRelation(relationId)) return null;

  try {
    const rows: any = await findUniqueDynamic(targetCollection, relationId);
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (row) return row.rootId || row.id;
  } catch {
    // Table/columns may not exist yet; fall through to the group lookup.
  }

  const byRoot = await findRowByRoot(targetCollection, relationId);
  if (byRoot.length > 0) return relationId;

  return relationId;
}

/** Find the primary id of a translation group for a specific locale. */
export async function resolveRelationIdForLocale(
  targetCollection: string,
  rootId: string,
  locale?: string | null
): Promise<string | null> {
  if (isEmptyRelation(rootId)) return null;

  const wanted = normalizeLocale(locale);
  const rows = await findRowByRoot(targetCollection, rootId);

  if (rows.length === 0) return rootId;

  const localized = rows.find((row) => normalizeLocale(row.locale) === wanted);
  if (localized) return localized.id;

  const fallback = rows.find(
    (row) => normalizeLocale(row.locale) === DEFAULT_CONTENT_LOCALE
  );
  if (fallback) return fallback.id;

  return orderByLocale(rows)[0].id;
}

/**
 * Map a stored relation id to the equivalent entry in `locale`.
 * Falls back to the default language (and finally to the original entry) when
 * no translation exists for the requested language.
 */
export async function resolveLocalizedRelationId(
  targetCollection: string,
  relationId: string,
  locale?: string | null
): Promise<string | null> {
  if (isEmptyRelation(relationId)) return null;

  const wanted = normalizeLocale(locale);

  let target: Record<string, any> | null = null;
  try {
    const rows: any = await findUniqueDynamic(targetCollection, relationId);
    target = Array.isArray(rows) ? rows[0] || null : rows || null;
  } catch {
    target = null;
  }

  if (!target) {
    // Stored value may already be a root id.
    const rootId = await resolveRelationRootId(targetCollection, relationId);
    return resolveRelationIdForLocale(targetCollection, rootId as string, wanted);
  }

  if (normalizeLocale(target.locale) === wanted) return target.id;

  const rootId = target.rootId || target.id;
  const localizedId = await resolveRelationIdForLocale(
    targetCollection,
    rootId,
    wanted
  );

  return localizedId || target.id;
}
