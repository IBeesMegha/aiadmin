/**
 * Relation Resolver
 * 
 * Dynamically resolves virtual relations using SQL joins.
 * No physical columns needed for inverse relations.
 */

import { prisma } from './prisma';
import { Field } from './types';
import { findManyDynamic, findUniqueDynamic } from './dynamic-prisma';
import { isVirtualRelation, ownsRelation } from './relation-metadata';

export interface ResolveOptions {
  maxDepth?: number;
  populate?: string[]; // Specific relations to populate
}

/**
 * Resolve all relations in an entry
 * 
 * Handles both:
 * - Physical relations (with FK columns)
 * - Virtual relations (inverse, no FK columns)
 */
export async function resolveRelations(
  entry: Record<string, any>,
  collectionName: string,
  fields: Field[],
  options: ResolveOptions = {}
): Promise<Record<string, any>> {
  const { maxDepth = 3, populate } = options;

  if (maxDepth <= 0) {
    return entry;
  }

  const resolved = { ...entry };
  const relationFields = fields.filter(f => f.type === 'relation');

  for (const field of relationFields) {
    // Skip if not in populate list (if specified)
    if (populate && !populate.includes(field.name)) {
      continue;
    }

    if (!field.relation) continue;

    try {
      if (isVirtualRelation(field)) {
        // Virtual relation - resolve via SQL query
        resolved[field.name] = await resolveVirtualRelation(
          entry,
          collectionName,
          field,
          { ...options, maxDepth: maxDepth - 1 }
        );
      } else if (ownsRelation(field)) {
        // Physical relation - resolve via FK
        resolved[field.name] = await resolvePhysicalRelation(
          entry,
          field,
          { ...options, maxDepth: maxDepth - 1 }
        );
      }
    } catch (error) {
      console.error(`[Relation Resolver] Error resolving ${field.name}:`, error);
      resolved[field.name] = null;
    }
  }

  return resolved;
}

/**
 * Resolve physical relation (has FK column)
 * 
 * Example: Blog.category (manyToOne)
 * - Physical column: blog.categoryId
 * - Resolves to: Category object
 */
async function resolvePhysicalRelation(
  entry: Record<string, any>,
  field: Field,
  options: ResolveOptions
): Promise<any> {
  if (!field.relation) return null;

  const { targetCollection, type: relationType } = field.relation;
  
  // Get FK column name (no Id suffix - field name is the FK column)
  const fkColumnName = sanitizeFieldName(field.name);
  const fkValue = entry[fkColumnName];

  console.log(`[Relation Resolver] Physical: ${field.name}, FK: ${fkColumnName} = ${fkValue}`);

  if (!fkValue) {
    return relationType === 'oneToMany' || relationType === 'manyToMany' ? [] : null;
  }

  if (relationType === 'manyToOne' || relationType === 'oneToOne') {
    // Fetch single related entry
    const result = await findUniqueDynamic(targetCollection, fkValue) as any[];
    
    if (!result || result.length === 0) {
      return null;
    }

    const relatedEntry = result[0];

    // Recursively resolve nested relations
    if (options.maxDepth! > 0) {
      const targetFields = await getCollectionFields(targetCollection);
      return await resolveRelations(
        relatedEntry,
        targetCollection,
        targetFields,
        { ...options, maxDepth: options.maxDepth! - 1 }
      );
    }

    return relatedEntry;
  }

  return null;
}

/**
 * Resolve virtual relation (no FK column)
 * 
 * Example: Category.blogs (oneToMany - inverse of Blog.category)
 * - NO physical column in category table
 * - Queries: SELECT * FROM blog WHERE categoryId = <category.id>
 */
async function resolveVirtualRelation(
  entry: Record<string, any>,
  collectionName: string,
  field: Field,
  options: ResolveOptions
): Promise<any> {
  if (!field.relation) return null;

  const { targetCollection, targetField, type: relationType } = field.relation;

  console.log(`[Relation Resolver] Virtual: ${field.name} (${relationType})`);
  console.log(`[Relation Resolver] Target: ${targetCollection}.${targetField}`);

  if (relationType === 'oneToMany') {
    // Virtual oneToMany: Query target collection for entries that reference this entry
    // Example: Category.blogs -> Query blog WHERE categoryId = <this category id>
    
    // No Id suffix - the field name itself is the FK column
    const targetFkColumnName = sanitizeFieldName(targetField);
    
    console.log(`[Relation Resolver] Querying ${targetCollection} WHERE ${targetFkColumnName} = ${entry.id}`);

    const relatedEntries = await findManyDynamic(targetCollection, {
      where: { [targetFkColumnName]: entry.id }
    }) as any[];

    console.log(`[Relation Resolver] Found ${relatedEntries?.length || 0} related entries`);

    if (!relatedEntries || relatedEntries.length === 0) {
      return [];
    }

    // Recursively resolve nested relations
    if (options.maxDepth! > 0) {
      const targetFields = await getCollectionFields(targetCollection);
      const resolved = await Promise.all(
        relatedEntries.map(e =>
          resolveRelations(e, targetCollection, targetFields, {
            ...options,
            maxDepth: options.maxDepth! - 1
          })
        )
      );
      return resolved;
    }

    return relatedEntries;
  }

  if (relationType === 'oneToOne') {
    // Virtual oneToOne: Query target collection for entry that references this entry
    // No Id suffix - the field name itself is the FK column
    const targetFkColumnName = sanitizeFieldName(targetField);
    
    const relatedEntries = await findManyDynamic(targetCollection, {
      where: { [targetFkColumnName]: entry.id }
    }) as any[];

    if (!relatedEntries || relatedEntries.length === 0) {
      return null;
    }

    const relatedEntry = relatedEntries[0];

    // Recursively resolve nested relations
    if (options.maxDepth! > 0) {
      const targetFields = await getCollectionFields(targetCollection);
      return await resolveRelations(
        relatedEntry,
        targetCollection,
        targetFields,
        { ...options, maxDepth: options.maxDepth! - 1 }
      );
    }

    return relatedEntry;
  }

  if (relationType === 'manyToMany') {
    // TODO: Implement manyToMany via junction table
    console.log('[Relation Resolver] manyToMany not yet implemented');
    return [];
  }

  return null;
}

/**
 * Resolve relations for multiple entries
 */
export async function resolveMultipleRelations(
  entries: Record<string, any>[],
  collectionName: string,
  fields: Field[],
  options: ResolveOptions = {}
): Promise<Record<string, any>[]> {
  return Promise.all(
    entries.map(entry => resolveRelations(entry, collectionName, fields, options))
  );
}

/**
 * Get collection fields
 */
async function getCollectionFields(collectionName: string): Promise<Field[]> {
  const collection = await prisma.collectionType.findUnique({
    where: { name: collectionName }
  });

  if (!collection) {
    return [];
  }

  return (collection.fields as any)?.fields || [];
}

/**
 * Sanitize field name to camelCase
 */
function sanitizeFieldName(fieldName: string): string {
  return fieldName
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .split('_')
    .filter((part: string) => part.length > 0)
    .map((part: string, index: number) =>
      index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join('');
}
