import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { getTableColumns } from './dynamic-table-service';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Generate a CUID-like ID
 */
function generateCuid(): string {
  return 'c' + randomBytes(12).toString('base64').replace(/[^a-z0-9]/gi, '').substring(0, 24);
}

/**
 * Execute raw SQL query
 */
export async function executeRawQuery(query: string, params: any[] = []) {
  return await prisma.$queryRawUnsafe(query, ...params);
}

/**
 * Get all records from a dynamic table
 */
export async function findManyDynamic(tableName: string, options?: { where?: Record<string, any> }) {
  const sanitizedTableName = tableName.toLowerCase().replace(/-/g, '_');
  
  if (options?.where) {
    const whereKeys = Object.keys(options.where);
    const whereValues = Object.values(options.where);
    const whereClause = whereKeys.map((key, i) => `"${key}" = $${i + 1}`).join(' AND ');
    const query = `SELECT * FROM "${sanitizedTableName}" WHERE ${whereClause} ORDER BY "createdAt" DESC`;
    
    console.log(`[findManyDynamic] Table: ${tableName} -> ${sanitizedTableName}`);
    console.log(`[findManyDynamic] Query: ${query}`);
    console.log(`[findManyDynamic] Values:`, whereValues);
    
    return await executeRawQuery(query, whereValues);
  }
  
  const query = `SELECT * FROM "${sanitizedTableName}" ORDER BY "createdAt" DESC`;
  return await executeRawQuery(query);
}

/**
 * Get single record from a dynamic table
 */
export async function findUniqueDynamic(tableName: string, id: string) {
  const sanitizedTableName = tableName.toLowerCase().replace(/-/g, '_');
  const query = `SELECT * FROM "${sanitizedTableName}" WHERE id = $1`;
  return await executeRawQuery(query, [id]);
}

/**
 * Filter out virtual relation fields that don't exist as physical database columns
 * This prevents trying to insert/update fields like "products" which are virtual Prisma relations
 */
async function filterVirtualRelationFields(
  tableName: string,
  data: Record<string, any>
): Promise<Record<string, any>> {
  const sanitizedTableName = tableName.toLowerCase().replace(/-/g, '_');
  
  // Get actual database columns
  const columnsInfo: any = await getTableColumns(sanitizedTableName);
  const actualColumns = new Set(
    columnsInfo.map((col: any) => col.column_name)
  );

  // Filter out fields that don't exist as physical columns
  const filteredData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (actualColumns.has(key)) {
      filteredData[key] = value;
    } else {
      console.log(`[Dynamic CRUD] Skipping virtual relation field: ${key} (not a physical column in ${tableName})`);
    }
  }

  return filteredData;
}

/**
 * Get a sensible default value for a database column based on its name and type.
 * This is used when the table has NOT NULL columns that weren't provided in input data.
 */
function getDefaultValueForColumn(col: { column_name: string; data_type: string }): any {
  const name = col.column_name.toLowerCase();
  
  if (name === 'locale') return 'en';
  if (name === 'status') return 'draft';
  if (name === 'publishedat' || name === 'published_at') return new Date();
  if (name === 'active' || name === 'isactive' || name === 'is_active') return true;
  if (name === 'enabled' || name === 'isenabled' || name === 'is_enabled') return true;
  
  if (col.data_type === 'boolean') return false;
  if (col.data_type === 'integer' || col.data_type === 'bigint') return 0;
  if (col.data_type === 'double precision' || col.data_type === 'real') return 0;
  if (col.data_type === 'timestamp' || col.data_type === 'timestamptz') return new Date();
  if (col.data_type === 'date') return new Date();
  if (col.data_type === 'json' || col.data_type === 'jsonb') return {};
  if (col.data_type === 'text' || col.data_type === 'character varying') return '';
  
  return undefined;
}

/**
 * Create record in a dynamic table
 */
export async function createDynamic(
  tableName: string,
  data: Record<string, any>
) {
  const sanitizedTableName = tableName.toLowerCase().replace(/-/g, '_');
  
  // First, get column types to know which are JSONB
  const columnsInfo: any = await getTableColumns(sanitizedTableName);

  const jsonbColumns = new Set(
    columnsInfo
      .filter((col: any) => col.data_type === 'jsonb')
      .map((col: any) => col.column_name)
  );

  // Build set of actual table column names
  const actualColumnNames = new Set(columnsInfo.map((col: any) => col.column_name));

  // Add default values for required fields
  const dataWithDefaults: Record<string, any> = {
    id: data.id || generateCuid(),
    ...data,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
  };

  // CRITICAL: Filter out virtual relation fields before processing
  // This prevents errors like: column "products" of relation "product_category" does not exist
  const filteredData = await filterVirtualRelationFields(tableName, dataWithDefaults);

  // Remove any data keys that don't correspond to actual table columns
  // This prevents errors when the table has extra columns that aren't
  // part of the collection field definitions but were added to the table schema
  for (const key of Object.keys(filteredData)) {
    if (!actualColumnNames.has(key)) {
      console.log(`[Dynamic CRUD] Skipping non-existent column: ${key} (not in table ${tableName})`);
      delete filteredData[key];
    }
  }

  // Provide sensible defaults for NOT NULL columns that exist in the table but weren't
  // provided in the input data. This prevents "null value in column violates not-null constraint" errors.
  // These extra columns (e.g., locale, status, publishedAt) may have been added to the table
  // directly via SQL or by a previous version of the schema.
  for (const col of columnsInfo) {
    const colName: string = col.column_name;
    if (col.is_nullable === 'NO' && !(colName in filteredData) && colName !== 'id' && colName !== 'createdAt' && colName !== 'updatedAt') {
      const defaultValue = getDefaultValueForColumn(col);
      if (defaultValue !== undefined) {
        console.log(`[Dynamic CRUD] Adding default value for NOT NULL column "${colName}": ${defaultValue}`);
        filteredData[colName] = defaultValue;
      }
    }
  }
  
  // Process data - keep objects/arrays as-is for JSONB columns
  // CRITICAL: Never stringify arrays/objects - Prisma handles JSONB serialization
  const processedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(filteredData)) {
    if (value === null || value === undefined) {
      processedData[key] = value;
    } else if (value instanceof Date) {
      // Keep Date objects as is - they'll be properly handled by Prisma
      processedData[key] = value;
    } else if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // Convert YYYY-MM-DD string to Date object
      processedData[key] = new Date(value);
    } else if (jsonbColumns.has(key)) {
      // For JSONB columns, ALWAYS keep objects/arrays as-is
      // NEVER stringify - Prisma will handle JSON serialization automatically
      if (typeof value === 'string' && (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
        // If it's already a JSON string (backward compatibility), parse it first
        try {
          processedData[key] = JSON.parse(value);
        } catch (e) {
          // If parsing fails, store as-is
          processedData[key] = value;
        }
      } else {
        // Already an object/array or primitive - store as-is (CORRECT)
        processedData[key] = value;
      }
    } else {
      // Non-JSONB column - store as-is
      processedData[key] = value;
    }
  }
  
  const columns = Object.keys(processedData);
  const values = Object.values(processedData).map((value, i) => {
    const colName = columns[i];
    // Convert objects/arrays to JSON strings for JSONB columns
    if (jsonbColumns.has(colName) && (typeof value === 'object' && value !== null && !(value instanceof Date))) {
      return JSON.stringify(value);
    }
    return value;
  });
  
  // Build placeholders with JSONB casting for JSONB columns
  const placeholders = values.map((_, i) => {
    const colName = columns[i];
    if (jsonbColumns.has(colName)) {
      return `$${i + 1}::jsonb`;
    }
    return `$${i + 1}`;
  }).join(', ');
  
  const query = `
    INSERT INTO "${sanitizedTableName}" (${columns.map(c => `"${c}"`).join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  console.log(`[Dynamic CRUD] Creating record in ${tableName} with columns:`, columns);
  console.log(`[Dynamic CRUD] Query:`, query);
  console.log(`[Dynamic CRUD] Values:`, values);
  
  const result: any = await executeRawQuery(query, values);
  return result[0];
}

/**
 * Update record in a dynamic table
 */
export async function updateDynamic(
  tableName: string,
  id: string,
  data: Record<string, any>
) {
  const sanitizedTableName = tableName.toLowerCase().replace(/-/g, '_');
  
  // First, get column types to know which are JSONB
  const columnsInfo: any = await getTableColumns(sanitizedTableName);
  const jsonbColumns = new Set(
    columnsInfo
      .filter((col: any) => col.data_type === 'jsonb')
      .map((col: any) => col.column_name)
  );

  // CRITICAL: Filter out virtual relation fields before processing
  // This prevents errors like: column "products" of relation "product_category" does not exist
  const filteredData = await filterVirtualRelationFields(tableName, data);

  // Remove updatedAt from data if it exists (we'll add it manually in the query)
  const { updatedAt, ...dataWithoutUpdatedAt } = filteredData;

  // Process data - keep objects/arrays as-is for JSONB columns
  // CRITICAL: Never stringify arrays/objects - Prisma handles JSONB serialization
  const processedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(dataWithoutUpdatedAt)) {
    if (value === null || value === undefined) {
      processedData[key] = value;
    } else if (value instanceof Date) {
      // Keep Date objects as is - they'll be properly handled by Prisma
      processedData[key] = value;
    } else if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // Convert YYYY-MM-DD string to Date object
      processedData[key] = new Date(value);
    } else if (jsonbColumns.has(key)) {
      // For JSONB columns, ALWAYS keep objects/arrays as-is
      // NEVER stringify - Prisma will handle JSON serialization automatically
      if (typeof value === 'string' && (value.trim().startsWith('[') || value.trim().startsWith('{'))) {
        // If it's already a JSON string (backward compatibility), parse it first
        try {
          processedData[key] = JSON.parse(value);
        } catch (e) {
          // If parsing fails, store as-is
          processedData[key] = value;
        }
      } else {
        // Already an object/array or primitive - store as-is (CORRECT)
        processedData[key] = value;
      }
    } else {
      // Non-JSONB column - store as-is
      processedData[key] = value;
    }
  }
  
  const columns = Object.keys(processedData);
  const values = Object.values(processedData).map((value, i) => {
    const colName = columns[i];
    // Convert objects/arrays to JSON strings for JSONB columns
    if (jsonbColumns.has(colName) && (typeof value === 'object' && value !== null && !(value instanceof Date))) {
      return JSON.stringify(value);
    }
    return value;
  });
  
  // Build SET clause with JSONB casting for JSONB columns
  const setClause = columns.map((col, i) => {
    if (jsonbColumns.has(col)) {
      return `"${col}" = $${i + 1}::jsonb`;
    }
    return `"${col}" = $${i + 1}`;
  }).join(', ');
  
  const query = `
    UPDATE "${sanitizedTableName}"
    SET ${setClause}, "updatedAt" = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `;
  
  console.log(`[Dynamic CRUD] Updating record in ${tableName} with columns:`, columns);
  console.log(`[Dynamic CRUD] Query:`, query);
  console.log(`[Dynamic CRUD] Values:`, values);
  
  const result: any = await executeRawQuery(query, [...values, id]);
  return result[0];
}

/**
 * Delete record from a dynamic table
 */
export async function deleteDynamic(tableName: string, id: string) {
  const sanitizedTableName = tableName.toLowerCase().replace(/-/g, '_');
  const query = `DELETE FROM "${sanitizedTableName}" WHERE id = $1 RETURNING *`;
  const result: any = await executeRawQuery(query, [id]);
  return result[0];
}

/**
 * Check if table exists in database
 */
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    tableName.toLowerCase().replace(/-/g, '_')
  );

  return result[0]?.exists || false;
}

/**
 * Get table columns (re-exported from dynamic-table-service)
 */
export { getTableColumns } from './dynamic-table-service';
