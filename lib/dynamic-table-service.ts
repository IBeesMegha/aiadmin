/**
 * Dynamic Table Service
 * Manages runtime SQL table creation without modifying Prisma schema
 * 
 * This service handles:
 * - Creating tables dynamically via raw SQL
 * - Adding/removing columns
 * - Dropping tables
 * - SQL injection prevention
 * - Safe naming validation
 */

import { prisma } from './prisma';
import { Field, RelationMetadata } from './types';

/**
 * Internationalization columns that every dynamic content table carries.
 *
 * - `locale`  language code of the entry (defaults to English)
 * - `rootId`  shared identifier across every translation of the same entry
 *
 * These are "logical" columns managed entirely at runtime (raw SQL): they are
 * never added to the Prisma schema or to Prisma migrations.
 */
export const I18N_LOCALE_COLUMN = 'locale';
export const I18N_ROOT_ID_COLUMN = 'rootId';

/** Default language code used for newly created entries when none is supplied. */
export const DEFAULT_CONTENT_LOCALE = 'en';

/**
 * In-process cache of tables whose i18n columns have already been ensured.
 * Avoids repeating the cheap catalog checks on every CRUD call.
 */
const i18nEnsuredTables = new Set<string>();

/**
 * Validate table/column name to prevent SQL injection
 * Only allows alphanumeric characters and underscores
 */
export function validateSqlIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Sanitize collection name to valid SQL table name
 * Converts kebab-case to snake_case
 */
export function sanitizeTableName(collectionName: string): string {
  return collectionName.toLowerCase().replace(/-/g, '_');
}

/**
 * Sanitize field name to valid SQL column name
 * Converts kebab-case and spaces to snake_case
 */
export function sanitizeColumnName(fieldName: string): string {
  return fieldName
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Convert field type to PostgreSQL column type
 */
function fieldTypeToPostgresType(field: Field): string {
  const typeMap: Record<string, string> = {
    'string': 'TEXT',
    'text': 'TEXT',
    'richtext': 'TEXT',
    'richtext-ckeditor': 'TEXT',
    'number': 'DOUBLE PRECISION',
    'boolean': 'BOOLEAN',
    'date': 'TIMESTAMP(3)',
    'email': 'TEXT',
    'json': 'JSONB',
    'component': 'JSONB',
    'dynamiczone': 'JSONB',
  };

  // Handle media fields
  if (field.type === 'media') {
    return field.multiple ? 'JSONB' : 'TEXT';
  }

  return typeMap[field.type] || 'TEXT';
}

/**
 * Check if table exists in database
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const sanitized = sanitizeTableName(tableName);
  
  if (!validateSqlIdentifier(sanitized)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    sanitized
  );

  return result[0]?.exists || false;
}

/**
 * Check if column exists in table
 */
export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const sanitizedTable = sanitizeTableName(tableName);
  const sanitizedColumn = sanitizeColumnName(columnName);

  if (!validateSqlIdentifier(sanitizedTable) || !validateSqlIdentifier(sanitizedColumn)) {
    throw new Error(`Invalid table or column name: ${tableName}.${columnName}`);
  }

  const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2
    )`,
    sanitizedTable,
    sanitizedColumn
  );

  return result[0]?.exists || false;
}

/**
 * Create a dynamic table with fields
 */
export async function createDynamicTable(
  collectionName: string,
  fields: Field[]
): Promise<void> {
  const tableName = sanitizeTableName(collectionName);

  if (!validateSqlIdentifier(tableName)) {
    throw new Error(`Invalid table name: ${collectionName}`);
  }

  // Check if table already exists
  if (await tableExists(tableName)) {
    throw new Error(`Table ${tableName} already exists`);
  }

  console.log(`[Dynamic Table] Creating table: ${tableName}`);

  // Build column definitions
  const columnDefs: string[] = [
    'id TEXT PRIMARY KEY',
    '"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
    '"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
    `"${I18N_LOCALE_COLUMN}" TEXT NOT NULL DEFAULT '${DEFAULT_CONTENT_LOCALE}'`,
    `"${I18N_ROOT_ID_COLUMN}" TEXT`,
  ];

  // Add custom fields
  for (const field of fields) {
    if (field.type === 'relation') {
      // Handle relation fields
      const columnName = sanitizeColumnName(field.name);
      
      if (!validateSqlIdentifier(columnName)) {
        console.warn(`[Dynamic Table] Skipping invalid column name: ${field.name}`);
        continue;
      }

      // Only create foreign key columns for relations that own the FK
      if (field.relation && !field.relation.isVirtual) {
        const { type } = field.relation;
        
        if (type === 'manyToOne' || type === 'oneToOne') {
          // Use the exact field name as the FK column (no Id suffix)
          // This matches what the user entered in the UI
          const fkColumnName = columnName;
          const nullable = field.required ? 'NOT NULL' : '';
          const unique = type === 'oneToOne' ? 'UNIQUE' : '';
          
          columnDefs.push(`"${fkColumnName}" TEXT ${nullable} ${unique}`.trim());
          console.log(`[Dynamic Table] Added FK column: ${fkColumnName}`);
        }
        // oneToMany and manyToMany don't create columns on this side
      }
    } else {
      // Handle regular fields
      const columnName = sanitizeColumnName(field.name);
      
      if (!validateSqlIdentifier(columnName)) {
        console.warn(`[Dynamic Table] Skipping invalid column name: ${field.name}`);
        continue;
      }

      const columnType = fieldTypeToPostgresType(field);
      const nullable = field.required ? 'NOT NULL' : '';
      const unique = field.unique ? 'UNIQUE' : '';
      const defaultValue = field.default !== undefined ? `DEFAULT '${field.default}'` : '';

      columnDefs.push(`"${columnName}" ${columnType} ${nullable} ${unique} ${defaultValue}`.trim());
      console.log(`[Dynamic Table] Added column: ${columnName} ${columnType}`);
    }
  }

  // Create table
  const createTableSQL = `
    CREATE TABLE "${tableName}" (
      ${columnDefs.join(',\n      ')}
    )
  `;

  console.log(`[Dynamic Table] SQL:\n${createTableSQL}`);

  await prisma.$executeRawUnsafe(createTableSQL);

  // Create index on createdAt for better query performance
  await prisma.$executeRawUnsafe(
    `CREATE INDEX "${tableName}_createdAt_idx" ON "${tableName}" ("createdAt" DESC)`
  );

  // Indexes backing translations (rootId lookups) and duplicate prevention
  await prisma.$executeRawUnsafe(
    `CREATE INDEX "${tableName}_rootId_idx" ON "${tableName}" ("rootId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX "${tableName}_rootId_locale_key" ON "${tableName}" ("rootId", "locale")`
  );

  // Table is brand new - its i18n columns are already in place.
  i18nEnsuredTables.add(tableName);

  console.log(`[Dynamic Table] ✓ Table ${tableName} created successfully`);
}

/**
 * Add a column to an existing table
 */
export async function addColumn(
  tableName: string,
  field: Field
): Promise<void> {
  const sanitizedTable = sanitizeTableName(tableName);
  const columnName = sanitizeColumnName(field.name);

  if (!validateSqlIdentifier(sanitizedTable) || !validateSqlIdentifier(columnName)) {
    throw new Error(`Invalid table or column name: ${tableName}.${field.name}`);
  }

  // Check if column already exists
  if (await columnExists(tableName, columnName)) {
    console.log(`[Dynamic Table] Column ${columnName} already exists in ${tableName}`);
    return;
  }

  console.log(`[Dynamic Table] Adding column: ${tableName}.${columnName}`);

  if (field.type === 'relation' && field.relation) {
    // Add foreign key column for relations that own the FK
    const { type } = field.relation;
    
    if (!field.relation.isVirtual && (type === 'manyToOne' || type === 'oneToOne')) {
      // Use the exact field name as the FK column (no Id suffix)
      const fkColumnName = columnName;
      const nullable = field.required ? 'NOT NULL' : '';
      const unique = type === 'oneToOne' ? 'UNIQUE' : '';

      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${sanitizedTable}" ADD COLUMN "${fkColumnName}" TEXT ${nullable} ${unique}`.trim()
      );
      
      console.log(`[Dynamic Table] ✓ Added FK column: ${fkColumnName}`);
    }
  } else {
    // Add regular column
    const columnType = fieldTypeToPostgresType(field);
    const nullable = field.required ? 'NOT NULL' : '';
    const unique = field.unique ? 'UNIQUE' : '';
    const defaultValue = field.default !== undefined ? `DEFAULT '${field.default}'` : '';

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${sanitizedTable}" ADD COLUMN "${columnName}" ${columnType} ${nullable} ${unique} ${defaultValue}`.trim()
    );

    console.log(`[Dynamic Table] ✓ Added column: ${columnName}`);
  }
}

/**
 * Remove a column from a table
 * NOTE: columnName should be the EXACT database column name (case-sensitive)
 */
export async function removeColumn(
  tableName: string,
  columnName: string
): Promise<void> {
  const sanitizedTable = sanitizeTableName(tableName);

  // Validate the column name format but DON'T sanitize it
  // because it comes from the database with the exact casing
  if (!validateSqlIdentifier(columnName)) {
    throw new Error(`Invalid column name: ${columnName}`);
  }

  // Check if column exists (pass original name)
  const exists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      AND column_name = $2
    )`,
    sanitizedTable,
    columnName  // Use exact database column name
  );

  if (!exists[0]?.exists) {
    console.log(`[Dynamic Table] Column ${columnName} does not exist in ${tableName}`);
    return;
  }

  console.log(`[Dynamic Table] Removing column: ${tableName}.${columnName}`);

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${sanitizedTable}" DROP COLUMN "${columnName}"`  // Use exact column name
  );

  console.log(`[Dynamic Table] ✓ Removed column: ${columnName}`);
}

/**
 * Rename a dynamic table (used when a collection is renamed)
 * Also renames the createdAt index created by createDynamicTable
 */
export async function renameDynamicTable(
  oldCollectionName: string,
  newCollectionName: string
): Promise<void> {
  const oldTable = sanitizeTableName(oldCollectionName);
  const newTable = sanitizeTableName(newCollectionName);

  if (!validateSqlIdentifier(oldTable) || !validateSqlIdentifier(newTable)) {
    throw new Error(
      `Invalid table name for rename: ${oldCollectionName} -> ${newCollectionName}`
    );
  }

  if (oldTable === newTable) return;

  if (!(await tableExists(oldTable))) {
    if (await tableExists(newTable)) return;
    throw new Error(`Table ${oldTable} does not exist`);
  }

  if (await tableExists(newTable)) {
    throw new Error(`Table ${newTable} already exists`);
  }

  console.log(`[Dynamic Table] Renaming table: ${oldTable} -> ${newTable}`);

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${oldTable}" RENAME TO "${newTable}"`
  );

  // Keep the index naming convention in sync (table name is part of the index name)
  try {
    await prisma.$executeRawUnsafe(
      `ALTER INDEX "${oldTable}_createdAt_idx" RENAME TO "${newTable}_createdAt_idx"`
    );
  } catch (error: any) {
    console.warn(
      `[Dynamic Table] Could not rename index ${oldTable}_createdAt_idx:`,
      error.message
    );
  }

  for (const suffix of ['_rootId_idx', '_rootId_locale_key']) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER INDEX "${oldTable}${suffix}" RENAME TO "${newTable}${suffix}"`
      );
    } catch (error: any) {
      console.warn(
        `[Dynamic Table] Could not rename index ${oldTable}${suffix}:`,
        error.message
      );
    }
  }

  console.log(`[Dynamic Table] ✓ Table renamed to ${newTable}`);
}

/**
 * Drop a dynamic table
 */
export async function dropDynamicTable(tableName: string): Promise<void> {
  const sanitized = sanitizeTableName(tableName);

  if (!validateSqlIdentifier(sanitized)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  // Check if table exists
  if (!(await tableExists(tableName))) {
    console.log(`[Dynamic Table] Table ${tableName} does not exist`);
    return;
  }

  console.log(`[Dynamic Table] Dropping table: ${tableName}`);

  await prisma.$executeRawUnsafe(`DROP TABLE "${sanitized}" CASCADE`);

  console.log(`[Dynamic Table] ✓ Table ${tableName} dropped successfully`);
}

/**
 * Get all columns in a table
 */
export async function getTableColumns(tableName: string): Promise<Array<{
  column_name: string;
  data_type: string;
  is_nullable: string;
}>> {
  const sanitized = sanitizeTableName(tableName);

  if (!validateSqlIdentifier(sanitized)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  return await prisma.$queryRawUnsafe<Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>>(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    sanitized
  );
}

/**
 * Ensure a dynamic content table carries the internationalization columns.
 *
 * This is the safe, non-destructive migration for already-existing tables:
 *   - adds `locale` (TEXT NOT NULL DEFAULT 'en') when missing
 *   - adds `rootId` (TEXT) when missing
 *   - backfills `rootId = id` for every existing row so each existing entry
 *     becomes the root of its own translation group (existing data untouched)
 *   - creates an index on `rootId` and a UNIQUE index on (`rootId`, `locale`)
 *     so a content type can never hold two entries with the same translation
 *     group + language
 *
 * It is idempotent and cached per process, so it is safe to call from hot paths.
 */
export async function ensureContentI18nSchema(
  collectionName: string
): Promise<void> {
  const tableName = sanitizeTableName(collectionName);

  if (!validateSqlIdentifier(tableName)) {
    throw new Error(`Invalid table name: ${collectionName}`);
  }

  if (i18nEnsuredTables.has(tableName)) return;
  if (!(await tableExists(tableName))) return;

  const existingColumns = await getTableColumns(tableName);
  const existingNames = new Set(existingColumns.map((col) => col.column_name));

  if (!existingNames.has(I18N_LOCALE_COLUMN)) {
    console.log(`[Dynamic Table] Adding i18n column: ${tableName}.${I18N_LOCALE_COLUMN}`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${tableName}" ADD COLUMN "${I18N_LOCALE_COLUMN}" TEXT NOT NULL DEFAULT '${DEFAULT_CONTENT_LOCALE}'`
    );
  }

  if (!existingNames.has(I18N_ROOT_ID_COLUMN)) {
    console.log(`[Dynamic Table] Adding i18n column: ${tableName}.${I18N_ROOT_ID_COLUMN}`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${tableName}" ADD COLUMN "${I18N_ROOT_ID_COLUMN}" TEXT`
    );
  }

  // Backfill: every existing entry becomes the root of its own translation group.
  await prisma.$executeRawUnsafe(
    `UPDATE "${tableName}" SET "${I18N_ROOT_ID_COLUMN}" = id WHERE "${I18N_ROOT_ID_COLUMN}" IS NULL`
  );

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "${tableName}_rootId_idx" ON "${tableName}" ("${I18N_ROOT_ID_COLUMN}")`
  );

  try {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${tableName}_rootId_locale_key" ON "${tableName}" ("${I18N_ROOT_ID_COLUMN}", "${I18N_LOCALE_COLUMN}")`
    );
  } catch (error: any) {
    // If legacy data already violates the constraint we keep the data intact
    // (non-destructive) and surface the problem instead of failing the request.
    console.error(
      `[Dynamic Table] Could not create unique (rootId, locale) index on ${tableName}:`,
      error.message
    );
  }

  i18nEnsuredTables.add(tableName);
  console.log(`[Dynamic Table] ✓ i18n schema ensured for ${tableName}`);
}

/**
 * Sync table schema with collection type fields
 * Adds missing columns and removes extra columns
 */
export async function syncTableSchema(
  collectionName: string,
  fields: Field[]
): Promise<void> {
  const tableName = sanitizeTableName(collectionName);

  console.log(`[Dynamic Table] Syncing schema for: ${tableName}`);

  // Guarantee the runtime i18n columns exist before we compare columns, so
  // they are never treated as obsolete and removed.
  await ensureContentI18nSchema(tableName);

  // Get existing columns
  const existingColumns = await getTableColumns(tableName);
  const existingColumnNames = new Set(
    existingColumns.map(col => col.column_name)
  );

  // Core columns that should always exist and should never be removed
  const coreColumns = new Set([
    'id',
    'createdAt',
    'updatedAt',
    I18N_LOCALE_COLUMN,
    I18N_ROOT_ID_COLUMN,
    // Legacy i18n columns from a previous storage design - kept so they are
    // never dropped if present in an older table.
    'translationGroupId',
    'lang',
    'localeStatus',
  ]);

  // Determine which columns should exist based on fields
  const expectedColumns = new Set<string>(Array.from(coreColumns));
  
  for (const field of fields) {
    const columnName = sanitizeColumnName(field.name);
    
    if (field.type === 'relation' && field.relation) {
      const { type } = field.relation;
      if (!field.relation.isVirtual && (type === 'manyToOne' || type === 'oneToOne')) {
        // Use the exact field name as the FK column (no Id suffix)
        expectedColumns.add(columnName);
      }
    } else {
      expectedColumns.add(columnName);
    }
  }

  // Add missing columns
  for (const field of fields) {
    const columnName = sanitizeColumnName(field.name);
    
    if (field.type === 'relation' && field.relation) {
      const { type } = field.relation;
      if (!field.relation.isVirtual && (type === 'manyToOne' || type === 'oneToOne')) {
        // Use the exact field name as the FK column
        const fkColumnName = columnName;
        if (!existingColumnNames.has(fkColumnName)) {
          await addColumn(collectionName, field);
        }
      }
    } else {
      if (!existingColumnNames.has(columnName)) {
        await addColumn(collectionName, field);
      }
    }
  }

  // Remove extra columns (excluding core columns)
  for (const col of existingColumns) {
    if (!coreColumns.has(col.column_name) && !expectedColumns.has(col.column_name)) {
      console.log(`[Dynamic Table] Removing obsolete column: ${col.column_name}`);
      await removeColumn(collectionName, col.column_name);
    }
  }

  console.log(`[Dynamic Table] ✓ Schema synced for ${tableName}`);
}
