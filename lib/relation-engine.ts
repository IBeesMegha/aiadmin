/**
 * Relation Engine - Handles bidirectional relations automatically
 * Similar to Strapi/Directus/Payload CMS
 */

import { Field, RelationMetadata } from './types';
import { prisma } from './prisma';

export interface RelationDefinition {
  sourceCollection: string;
  sourceField: string;
  targetCollection: string;
  targetField: string;
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  relationName: string;
}

/**
 * Generate unique relation name
 */
export function generateRelationName(
  sourceCollection: string,
  targetCollection: string
): string {
  const source = toPascalCase(sourceCollection);
  const target = toPascalCase(targetCollection);
  return `${source}To${target}`;
}

/**
 * Convert to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Convert to camelCase
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Get opposite relation type
 */
export function getOppositeRelationType(
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
): 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany' {
  const oppositeMap = {
    oneToOne: 'oneToOne',
    oneToMany: 'manyToOne',
    manyToOne: 'oneToMany',
    manyToMany: 'manyToMany',
  } as const;
  
  return oppositeMap[relationType];
}

/**
 * Determine which side owns the foreign key
 */
export function determineOwnerSide(
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
): 'source' | 'target' | 'none' {
  switch (relationType) {
    case 'oneToOne':
      return 'source'; // Source owns the FK
    case 'manyToOne':
      return 'source'; // Many side owns the FK
    case 'oneToMany':
      return 'target'; // Target (many side) owns the FK
    case 'manyToMany':
      return 'none'; // Join table (implicit in Prisma)
  }
}

/**
 * Create relation definition from field
 */
export function createRelationDefinition(
  sourceCollection: string,
  field: Field
): RelationDefinition | null {
  if (field.type !== 'relation' || !field.relation) {
    return null;
  }

  const relationName = generateRelationName(
    sourceCollection,
    field.relation.targetCollection
  );

  return {
    sourceCollection,
    sourceField: field.name,
    targetCollection: field.relation.targetCollection,
    targetField: field.relation.targetField,
    relationType: field.relation.type,
    relationName,
  };
}

/**
 * Generate opposite relation field
 */
export function generateOppositeField(
  relation: RelationDefinition
): Field {
  const oppositeType = getOppositeRelationType(relation.relationType);
  
  return {
    name: relation.targetField,
    displayName: relation.targetField,
    type: 'relation',
    relation: {
      type: oppositeType,
      targetCollection: relation.sourceCollection,
      targetCollectionDisplay: toPascalCase(relation.sourceCollection),
      targetField: relation.sourceField,
      relationName: relation.relationName,
      isOwner: determineOwnerSide(relation.relationType) === 'target',
    },
  };
}

/**
 * Get all collection types with their fields
 */
export async function getAllCollectionTypes(): Promise<Map<string, Field[]>> {
  const collections = await prisma.collectionType.findMany();
  const collectionMap = new Map<string, Field[]>();
  
  for (const collection of collections) {
    const fields = (collection.fields as any)?.fields || [];
    collectionMap.set(collection.name, fields);
  }
  
  return collectionMap;
}

/**
 * Update collection type fields in database
 */
export async function updateCollectionFields(
  collectionName: string,
  fields: Field[]
): Promise<void> {
  await prisma.collectionType.update({
    where: { name: collectionName },
    data: {
      fields: { fields } as any,
    },
  });
}

/**
 * Add opposite relation fields to all affected collections
 * This is the main function that handles bidirectional relations
 */
export async function synchronizeRelations(
  sourceCollection: string,
  sourceFields: Field[]
): Promise<Map<string, Field[]>> {
  // Get all existing collections
  const allCollections = await getAllCollectionTypes();
  const updatedCollections = new Map<string, Field[]>();
  
  // Track which collections need updates
  const collectionsToUpdate = new Map<string, Field[]>();
  collectionsToUpdate.set(sourceCollection, sourceFields);
  
  // Process each relation field in source collection
  for (const field of sourceFields) {
    if (field.type !== 'relation' || !field.relation) {
      continue;
    }
    
    const relation = createRelationDefinition(sourceCollection, field);
    if (!relation) {
      continue;
    }
    
    // Get target collection fields
    const targetFields = allCollections.get(relation.targetCollection);
    if (!targetFields) {
      console.warn(`Target collection ${relation.targetCollection} not found`);
      continue;
    }
    
    // Check if opposite field already exists
    const oppositeFieldExists = targetFields.some(
      f => f.name === relation.targetField && f.type === 'relation'
    );
    
    if (!oppositeFieldExists) {
      // Generate and add opposite field
      const oppositeField = generateOppositeField(relation);
      const updatedTargetFields = [...targetFields, oppositeField];
      collectionsToUpdate.set(relation.targetCollection, updatedTargetFields);
      updatedCollections.set(relation.targetCollection, updatedTargetFields);
      
      console.log(`✓ Added opposite relation field ${relation.targetField} to ${relation.targetCollection}`);
    }
  }
  
  // Update all affected collections in database
  for (const [collectionName, fields] of Array.from(collectionsToUpdate.entries())) {
    if (collectionName !== sourceCollection) {
      await updateCollectionFields(collectionName, fields);
    }
  }
  
  return updatedCollections;
}

/**
 * Remove orphaned opposite relation fields
 * Called when a relation field is removed
 */
export async function cleanupOrphanedRelations(
  sourceCollection: string,
  removedField: Field
): Promise<void> {
  if (removedField.type !== 'relation' || !removedField.relation) {
    return;
  }
  
  const targetCollection = removedField.relation.targetCollection;
  const targetField = removedField.relation.targetField;
  
  // Get target collection fields
  const allCollections = await getAllCollectionTypes();
  const targetFields = allCollections.get(targetCollection);
  
  if (!targetFields) {
    return;
  }
  
  // Remove the opposite field
  const updatedFields = targetFields.filter(
    f => !(f.name === targetField && f.type === 'relation')
  );
  
  if (updatedFields.length !== targetFields.length) {
    await updateCollectionFields(targetCollection, updatedFields);
    console.log(`✓ Removed orphaned relation field ${targetField} from ${targetCollection}`);
  }
}

/**
 * Validate relation consistency
 */
export function validateRelation(
  sourceCollection: string,
  field: Field,
  allCollections: Map<string, Field[]>
): { valid: boolean; error?: string } {
  if (field.type !== 'relation' || !field.relation) {
    return { valid: true };
  }
  
  // Check if target collection exists
  if (!allCollections.has(field.relation.targetCollection)) {
    return {
      valid: false,
      error: `Target collection ${field.relation.targetCollection} does not exist`,
    };
  }
  
  // Check for circular self-references in one-to-one
  if (
    field.relation.type === 'oneToOne' &&
    field.relation.targetCollection === sourceCollection
  ) {
    return {
      valid: false,
      error: 'Self-referential one-to-one relations are not supported',
    };
  }
  
  return { valid: true };
}

/**
 * Get all relations for a collection
 */
export function getCollectionRelations(
  collectionName: string,
  fields: Field[]
): RelationDefinition[] {
  return fields
    .filter(f => f.type === 'relation' && f.relation)
    .map(f => createRelationDefinition(collectionName, f))
    .filter((r): r is RelationDefinition => r !== null);
}

/**
 * Check if a field is a relation owner (has foreign key)
 */
export function isRelationOwner(field: Field): boolean {
  if (field.type !== 'relation' || !field.relation) {
    return false;
  }
  
  const ownerSide = determineOwnerSide(field.relation.type);
  return ownerSide === 'source' || field.relation.isOwner === true;
}

/**
 * Check if a field is a virtual relation field (no physical column in database)
 * Virtual relation fields should NOT be included in INSERT/UPDATE SQL queries
 * 
 * Examples:
 * - oneToMany: ProductCategory.products (virtual, no column)
 * - manyToOne: Product.category (has categoryId column, but "category" itself is virtual)
 */
export function isVirtualRelationField(field: Field): boolean {
  if (field.type !== 'relation' || !field.relation) {
    return false;
  }
  
  // oneToMany relations are always virtual (no FK on this side)
  // Example: ProductCategory.products - this is virtual, the FK is on Product table
  if (field.relation.type === 'oneToMany') {
    return true;
  }
  
  // manyToMany relations are virtual (join table is implicit)
  if (field.relation.type === 'manyToMany') {
    return true;
  }
  
  // For oneToOne and manyToOne, the relation field itself stores the FK
  // The field name IS the FK column (no Id suffix)
  // The field name without "Id" suffix is virtual
  return true;
}

/**
 * Get the foreign key column name for a relation field
 * Returns null if the field doesn't have a physical FK column
 * 
 * Examples:
 * - Product.category -> "categoryId"
 * - ProductCategory.products -> null (virtual, no FK)
 */
export function getForeignKeyColumnName(field: Field): string | null {
  if (field.type !== 'relation' || !field.relation) {
    return null;
  }
  
  const ownerSide = determineOwnerSide(field.relation.type);
  
  // Only owner side has FK column (no Id suffix - field name is the FK column)
  if (ownerSide === 'source' || field.relation.isOwner === true) {
    return field.name;
  }
  
  return null;
}

/**
 * Filter out virtual relation fields from data object
 * This should be called before INSERT/UPDATE operations
 * 
 * Virtual fields: oneToMany, manyToMany (no physical column)
 * FK fields: manyToOne, oneToOne (has physical column with same name as field)
 * 
 * @param fields - Field definitions from collection type
 * @param data - Data object to filter
 * @returns Filtered data with only physical columns
 */
export function filterVirtualRelationFields(
  fields: Field[],
  data: Record<string, any>
): Record<string, any> {
  const filteredData: Record<string, any> = {};
  
  // Get list of VIRTUAL relation field names (oneToMany, manyToMany)
  const virtualRelationFieldNames = new Set(
    fields
      .filter(f => f.type === 'relation' && f.relation)
      .filter(f => f.relation!.type === 'oneToMany' || f.relation!.type === 'manyToMany')
      .map(f => f.name)
  );
  
  console.log('[Relation Engine] Virtual relation field names:', Array.from(virtualRelationFieldNames));
  console.log('[Relation Engine] Input data keys:', Object.keys(data));
  
  for (const [key, value] of Object.entries(data)) {
    // Skip if this is a VIRTUAL relation field (oneToMany, manyToMany)
    if (virtualRelationFieldNames.has(key)) {
      console.log(`[Relation Engine] Skipping virtual relation field: ${key}`);
      continue;
    }
    
    // Keep all other fields (including FK columns for manyToOne/oneToOne)
    filteredData[key] = value;
    console.log(`[Relation Engine] Keeping field: ${key} = ${value}`);
  }
  
  console.log('[Relation Engine] Output data keys:', Object.keys(filteredData));
  
  return filteredData;
}
