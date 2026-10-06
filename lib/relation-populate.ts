/**
 * Relation Population System
 * 
 * Automatically populates relation fields with complete objects instead of just IDs
 * Supports:
 * - oneToOne relations
 * - oneToMany relations
 * - manyToOne relations
 * - manyToMany relations
 * - Nested relation population
 * - Circular reference detection
 */

import { prisma } from './prisma';
import { Field } from './types';
import { findManyDynamic, findUniqueDynamic } from './dynamic-prisma';

export interface PopulateOptions {
  maxDepth?: number;
  fields?: string[]; // Specific fields to populate (if not provided, populate all)
}

/**
 * Populate all relation fields in an entry
 * 
 * @param entry - The collection entry with relation IDs
 * @param collectionName - Name of the collection
 * @param fields - Field definitions from the collection type
 * @param options - Population options
 * @returns Entry with populated relations
 */
export async function populateRelations(
  entry: Record<string, any>,
  collectionName: string,
  fields: Field[],
  options: PopulateOptions = {}
): Promise<Record<string, any>> {
  const { maxDepth = 3, fields: fieldsToPopulate } = options;
  
  if (maxDepth <= 0) {
    console.log('[Relation Populate] Max depth reached, stopping recursion');
    return entry;
  }

  const populatedEntry = { ...entry };
  const visitedIds = new Set<string>(); // Circular reference detection
  visitedIds.add(`${collectionName}:${entry.id}`);

  // Find all relation fields
  const relationFields = fields.filter(f => 
    f.type === 'relation' && 
    f.relation &&
    (!fieldsToPopulate || fieldsToPopulate.includes(f.name))
  );

  console.log(`[Relation Populate] Found ${relationFields.length} relation fields in ${collectionName}`);

  for (const field of relationFields) {
    // The field name in the database matches the field name in the schema (no sanitization)
    const fkFieldName = field.name;
    const fkValue = entry[fkFieldName];
    
    console.log(`[Relation Populate] Processing field: ${field.name}, FK value: ${fkValue}`);

    if (!field.relation) continue;

    try {
      const relationType = field.relation.type;
      const targetCollection = field.relation.targetCollection;

      if (relationType === 'manyToOne' || relationType === 'oneToOne') {
        // Populate single relation using FK field
        if (fkValue) {
          // Use the original field name for the populated object
          populatedEntry[field.name] = await populateSingleRelation(
            fkValue,
            targetCollection,
            visitedIds,
            { ...options, maxDepth: maxDepth - 1 }
          );
          console.log(`[Relation Populate] Populated ${field.name} with related data`);
        } else {
          populatedEntry[field.name] = null;
        }
      } else if (relationType === 'oneToMany') {
        // Populate array of relations
        populatedEntry[field.name] = await populateManyRelation(
          entry.id,
          targetCollection,
          field.relation.targetField, // The FK field on the target collection
          visitedIds,
          { ...options, maxDepth: maxDepth - 1 }
        );
      } else if (relationType === 'manyToMany') {
        // Populate many-to-many relations using Prisma
        try {
          const sanitizedTableName = collectionName.toLowerCase().replace(/-/g, '_');
          const model = (prisma as any)[sanitizedTableName];
          
          if (model) {
            const result = await model.findUnique({
              where: { id: entry.id },
              select: {
                [field.name]: {
                  select: {
                    id: true,
                    name: true,
                    title: true,
                    displayName: true,
                  }
                }
              }
            });
            
            if (result && result[field.name]) {
              entry[field.name] = result[field.name];
              console.log(`[Relation Populate] Populated manyToMany ${field.name}:`, result[field.name]);
            }
          }
        } catch (error) {
          console.error(`[Relation Populate] Error populating manyToMany ${field.name}:`, error);
        }
      }
    } catch (error) {
      console.error(`[Relation Populate] Error populating field ${field.name}:`, error);
      // Keep original value on error - use the FK value if available
      if (entry[field.name]) {
        populatedEntry[field.name] = entry[field.name];
      }
    }
  }

  return populatedEntry;
}

/**
 * Populate a single relation (manyToOne or oneToOne)
 */
async function populateSingleRelation(
  relationId: string,
  targetCollection: string,
  visitedIds: Set<string>,
  options: PopulateOptions
): Promise<Record<string, any> | null> {
  const visitKey = `${targetCollection}:${relationId}`;
  
  // Circular reference check
  if (visitedIds.has(visitKey)) {
    console.log(`[Relation Populate] Circular reference detected: ${visitKey}`);
    return { id: relationId, _circular: true };
  }

  visitedIds.add(visitKey);

  try {
    // Fetch the related entry
    const result = await findUniqueDynamic(targetCollection, relationId) as any[];
    
    if (!result || result.length === 0) {
      console.log(`[Relation Populate] Related entry not found: ${targetCollection}:${relationId}`);
      return null;
    }

    const relatedEntry = result[0];

    // Get target collection type to find nested relations
    const targetCollectionType = await prisma.collectionType.findUnique({
      where: { name: targetCollection },
    });

    if (!targetCollectionType) {
      return relatedEntry;
    }

    const targetFields = (targetCollectionType.fields as any)?.fields || [];

    // Recursively populate nested relations if depth allows
    if (options.maxDepth! > 0) {
      return await populateRelations(
        relatedEntry,
        targetCollection,
        targetFields,
        { ...options, maxDepth: options.maxDepth! - 1 }
      );
    }

    return relatedEntry;
  } catch (error) {
    console.error(`[Relation Populate] Error fetching related entry:`, error);
    return null;
  }
}

/**
 * Populate many relations (oneToMany)
 */
async function populateManyRelation(
  sourceId: string,
  targetCollection: string,
  targetFkField: string, // e.g., "blogCate" - the relation field name on the target
  visitedIds: Set<string>,
  options: PopulateOptions
): Promise<Record<string, any>[]> {
  try {
    // Get target collection type
    const targetCollectionType = await prisma.collectionType.findUnique({
      where: { name: targetCollection },
    });

    if (!targetCollectionType) {
      console.log(`[Relation Populate] Target collection not found: ${targetCollection}`);
      return [];
    }

    const targetFields = (targetCollectionType.fields as any)?.fields || [];

    // The target FK field name is used as-is (no sanitization)
    // e.g., if targetFkField is "products", the FK column in DB is also "products"
    const fkColumnName = targetFkField;

    console.log(`[Relation Populate] Querying ${targetCollection} where ${fkColumnName} = ${sourceId}`);

    // Query all entries in target collection that reference this entry
    const relatedEntries = await findManyDynamic(targetCollection, {
      where: { [fkColumnName]: sourceId }
    }) as any[];

    console.log(`[Relation Populate] Found ${relatedEntries?.length || 0} related entries`);

    if (!relatedEntries || relatedEntries.length === 0) {
      return [];
    }

    // Recursively populate nested relations for each entry
    const populated: Record<string, any>[] = [];
    
    for (const entry of relatedEntries) {
      const visitKey = `${targetCollection}:${entry.id}`;
      
      // Skip if circular reference
      if (visitedIds.has(visitKey)) {
        console.log(`[Relation Populate] Circular reference detected: ${visitKey}`);
        populated.push({ id: entry.id, _circular: true });
        continue;
      }

      const newVisitedIds = new Set(visitedIds);
      newVisitedIds.add(visitKey);

      if (options.maxDepth! > 0) {
        const populatedEntry = await populateRelations(
          entry,
          targetCollection,
          targetFields,
          { ...options, maxDepth: options.maxDepth! - 1 }
        );
        populated.push(populatedEntry);
      } else {
        populated.push(entry);
      }
    }

    return populated;
  } catch (error) {
    console.error(`[Relation Populate] Error fetching related entries:`, error);
    return [];
  }
}

/**
 * Populate relations for multiple entries at once
 */
export async function populateMultipleRelations(
  entries: Record<string, any>[],
  collectionName: string,
  fields: Field[],
  options: PopulateOptions = {}
): Promise<Record<string, any>[]> {
  return Promise.all(
    entries.map(entry => populateRelations(entry, collectionName, fields, options))
  );
}

/**
 * Check if a field should be populated
 */
export function shouldPopulateField(
  field: Field,
  fieldsToPopulate?: string[]
): boolean {
  if (field.type !== 'relation' || !field.relation) {
    return false;
  }

  if (!fieldsToPopulate) {
    return true; // Populate all relations by default
  }

  return fieldsToPopulate.includes(field.name);
}
