/**
 * Junction Table Service
 * 
 * Manages many-to-many relations via junction tables.
 * Junction tables are created dynamically and managed separately.
 */

import { prisma } from './prisma';
import { sanitizeTableName } from './dynamic-table-service';

export interface JunctionTableDefinition {
  sourceCollection: string;
  targetCollection: string;
  relationName: string;
}

/**
 * Generate junction table name
 * 
 * Example: blog + tag -> blog_tag_junction
 */
export function generateJunctionTableName(
  sourceCollection: string,
  targetCollection: string
): string {
  const source = sanitizeTableName(sourceCollection);
  const target = sanitizeTableName(targetCollection);
  
  // Alphabetical order for consistency
  const [first, second] = [source, target].sort();
  
  return `${first}_${second}_junction`;
}

/**
 * Create junction table for many-to-many relation
 */
export async function createJunctionTable(
  definition: JunctionTableDefinition
): Promise<void> {
  const { sourceCollection, targetCollection, relationName } = definition;
  
  const junctionTableName = generateJunctionTableName(sourceCollection, targetCollection);
  const sourceTableName = sanitizeTableName(sourceCollection);
  const targetTableName = sanitizeTableName(targetCollection);

  console.log(`[Junction Table] Creating: ${junctionTableName}`);

  // Check if table already exists
  const exists = await tableExists(junctionTableName);
  if (exists) {
    console.log(`[Junction Table] Table ${junctionTableName} already exists`);
    return;
  }

  // Create junction table
  const createTableSQL = `
    CREATE TABLE "${junctionTableName}" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "${sourceTableName}_id" TEXT NOT NULL,
      "${targetTableName}_id" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE("${sourceTableName}_id", "${targetTableName}_id")
    )
  `;

  await prisma.$executeRawUnsafe(createTableSQL);

  // Create indexes for better query performance
  await prisma.$executeRawUnsafe(
    `CREATE INDEX "${junctionTableName}_${sourceTableName}_idx" 
     ON "${junctionTableName}" ("${sourceTableName}_id")`
  );

  await prisma.$executeRawUnsafe(
    `CREATE INDEX "${junctionTableName}_${targetTableName}_idx" 
     ON "${junctionTableName}" ("${targetTableName}_id")`
  );

  console.log(`[Junction Table] ✓ Created ${junctionTableName}`);
}

/**
 * Drop junction table
 */
export async function dropJunctionTable(
  sourceCollection: string,
  targetCollection: string
): Promise<void> {
  const junctionTableName = generateJunctionTableName(sourceCollection, targetCollection);

  console.log(`[Junction Table] Dropping: ${junctionTableName}`);

  const exists = await tableExists(junctionTableName);
  if (!exists) {
    console.log(`[Junction Table] Table ${junctionTableName} does not exist`);
    return;
  }

  await prisma.$executeRawUnsafe(`DROP TABLE "${junctionTableName}" CASCADE`);

  console.log(`[Junction Table] ✓ Dropped ${junctionTableName}`);
}

/**
 * Add relation to junction table
 */
export async function addJunctionRelation(
  sourceCollection: string,
  targetCollection: string,
  sourceId: string,
  targetId: string
): Promise<void> {
  const junctionTableName = generateJunctionTableName(sourceCollection, targetCollection);
  const sourceTableName = sanitizeTableName(sourceCollection);
  const targetTableName = sanitizeTableName(targetCollection);

  const query = `
    INSERT INTO "${junctionTableName}" ("${sourceTableName}_id", "${targetTableName}_id")
    VALUES ($1, $2)
    ON CONFLICT ("${sourceTableName}_id", "${targetTableName}_id") DO NOTHING
  `;

  await prisma.$executeRawUnsafe(query, sourceId, targetId);
}

/**
 * Remove relation from junction table
 */
export async function removeJunctionRelation(
  sourceCollection: string,
  targetCollection: string,
  sourceId: string,
  targetId: string
): Promise<void> {
  const junctionTableName = generateJunctionTableName(sourceCollection, targetCollection);
  const sourceTableName = sanitizeTableName(sourceCollection);
  const targetTableName = sanitizeTableName(targetCollection);

  const query = `
    DELETE FROM "${junctionTableName}"
    WHERE "${sourceTableName}_id" = $1 AND "${targetTableName}_id" = $2
  `;

  await prisma.$executeRawUnsafe(query, sourceId, targetId);
}

/**
 * Get all related IDs from junction table
 */
export async function getJunctionRelations(
  sourceCollection: string,
  targetCollection: string,
  sourceId: string,
  direction: 'forward' | 'reverse' = 'forward'
): Promise<string[]> {
  const junctionTableName = generateJunctionTableName(sourceCollection, targetCollection);
  const sourceTableName = sanitizeTableName(sourceCollection);
  const targetTableName = sanitizeTableName(targetCollection);

  let query: string;
  let params: string[];

  if (direction === 'forward') {
    // Get target IDs for given source ID
    query = `
      SELECT "${targetTableName}_id" as id
      FROM "${junctionTableName}"
      WHERE "${sourceTableName}_id" = $1
    `;
    params = [sourceId];
  } else {
    // Get source IDs for given target ID (reverse lookup)
    query = `
      SELECT "${sourceTableName}_id" as id
      FROM "${junctionTableName}"
      WHERE "${targetTableName}_id" = $1
    `;
    params = [sourceId];
  }

  const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(query, ...params);
  return result.map(r => r.id);
}

/**
 * Clear all relations for an entry
 */
export async function clearJunctionRelations(
  sourceCollection: string,
  targetCollection: string,
  sourceId: string
): Promise<void> {
  const junctionTableName = generateJunctionTableName(sourceCollection, targetCollection);
  const sourceTableName = sanitizeTableName(sourceCollection);

  const query = `
    DELETE FROM "${junctionTableName}"
    WHERE "${sourceTableName}_id" = $1
  `;

  await prisma.$executeRawUnsafe(query, sourceId);
}

/**
 * Check if junction table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    tableName
  );

  return result[0]?.exists || false;
}

/**
 * Sync junction table relations
 * 
 * Used when updating many-to-many relations
 */
export async function syncJunctionRelations(
  sourceCollection: string,
  targetCollection: string,
  sourceId: string,
  targetIds: string[]
): Promise<void> {
  // Clear existing relations
  await clearJunctionRelations(sourceCollection, targetCollection, sourceId);

  // Add new relations
  for (const targetId of targetIds) {
    await addJunctionRelation(sourceCollection, targetCollection, sourceId, targetId);
  }
}
