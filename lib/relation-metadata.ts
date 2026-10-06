/**
 * Relation Metadata System
 * 
 * Manages bidirectional relations in a metadata-driven way.
 * - Automatically creates inverse relations
 * - Only owner side has physical FK columns
 * - Inverse relations are virtual (metadata only)
 * - Resolved dynamically via SQL joins
 */

import { prisma } from './prisma';
import { Field, RelationMetadata } from './types';

export interface RelationDefinition {
  sourceCollection: string;
  sourceField: string;
  targetCollection: string;
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  displayName?: string;
}

export interface RelationOwnership {
  ownerCollection: string;
  ownerField: string;
  inverseCollection: string;
  inverseField: string;
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  relationName: string;
}

/**
 * Determine which side owns the foreign key
 * 
 * Rules:
 * - oneToOne: First side (source) owns FK
 * - manyToOne: Many side (source) owns FK
 * - oneToMany: Many side (target) owns FK
 * - manyToMany: Neither owns FK (junction table)
 */
export function determineRelationOwnership(
  sourceCollection: string,
  sourceField: string,
  targetCollection: string,
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
): RelationOwnership {
  const relationName = `${toPascalCase(sourceCollection)}To${toPascalCase(targetCollection)}`;
  
  // Generate inverse field name
  const inverseField = generateInverseFieldName(sourceCollection, relationType);
  
  switch (relationType) {
    case 'oneToOne':
      // Source owns FK
      return {
        ownerCollection: sourceCollection,
        ownerField: sourceField,
        inverseCollection: targetCollection,
        inverseField,
        relationType: 'oneToOne',
        relationName
      };
      
    case 'manyToOne':
      // Source (many side) owns FK
      return {
        ownerCollection: sourceCollection,
        ownerField: sourceField,
        inverseCollection: targetCollection,
        inverseField,
        relationType: 'oneToMany', // Inverse is oneToMany
        relationName
      };
      
    case 'oneToMany':
      // Target (many side) owns FK
      return {
        ownerCollection: targetCollection,
        ownerField: generateInverseFieldName(targetCollection, 'manyToOne'),
        inverseCollection: sourceCollection,
        inverseField: sourceField,
        relationType: 'manyToOne', // Inverse is manyToOne
        relationName
      };
      
    case 'manyToMany':
      // Neither owns FK (junction table)
      return {
        ownerCollection: '', // No owner
        ownerField: '',
        inverseCollection: targetCollection,
        inverseField,
        relationType: 'manyToMany',
        relationName
      };
  }
}

/**
 * Generate inverse field name
 * Pluralizes for oneToMany, singularizes for others
 */
function generateInverseFieldName(
  collectionName: string,
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
): string {
  const baseName = collectionName.replace(/-/g, '_');
  
  // Pluralize for oneToMany and manyToMany
  if (relationType === 'oneToMany' || relationType === 'manyToMany') {
    return pluralize(baseName);
  }
  
  return baseName;
}

/**
 * Simple pluralization
 */
function pluralize(word: string): string {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z')) {
    return word + 'es';
  }
  return word + 's';
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
 * Create a relation and its inverse
 * 
 * This is the main function to call when creating a relation.
 * It automatically creates the inverse relation as virtual metadata.
 */
export async function createRelation(
  definition: RelationDefinition
): Promise<{
  sourceField: Field;
  inverseField: Field;
  ownership: RelationOwnership;
}> {
  const {
    sourceCollection,
    sourceField,
    targetCollection,
    relationType,
    displayName
  } = definition;

  console.log(`\n[Relation Metadata] Creating relation: ${sourceCollection}.${sourceField} -> ${relationType} -> ${targetCollection}`);

  // Determine ownership
  const ownership = determineRelationOwnership(
    sourceCollection,
    sourceField,
    targetCollection,
    relationType
  );

  console.log(`[Relation Metadata] Owner: ${ownership.ownerCollection}.${ownership.ownerField}`);
  console.log(`[Relation Metadata] Inverse: ${ownership.inverseCollection}.${ownership.inverseField}`);

  // Create source field metadata
  const sourceFieldMeta: Field = {
    name: sourceField,
    type: 'relation',
    displayName: displayName || toPascalCase(targetCollection),
    required: false,
    relation: {
      type: relationType,
      targetCollection,
      targetCollectionDisplay: toPascalCase(targetCollection),
      targetField: ownership.inverseField,
      relationName: ownership.relationName,
      isOwner: ownership.ownerCollection === sourceCollection
    }
  };

  // Create inverse field metadata (VIRTUAL - no physical column)
  const inverseRelationType = getInverseRelationType(relationType);
  const inverseFieldMeta: Field = {
    name: ownership.inverseField,
    type: 'relation',
    displayName: pluralize(toPascalCase(sourceCollection)),
    required: false,
    relation: {
      type: inverseRelationType,
      targetCollection: sourceCollection,
      targetCollectionDisplay: toPascalCase(sourceCollection),
      targetField: sourceField,
      relationName: ownership.relationName,
      isOwner: ownership.ownerCollection === targetCollection,
      isVirtual: true // IMPORTANT: Mark as virtual
    }
  };

  // Add source field to source collection
  await addFieldToCollection(sourceCollection, sourceFieldMeta);
  console.log(`[Relation Metadata] ✓ Added ${sourceField} to ${sourceCollection}`);

  // Add inverse field to target collection (VIRTUAL)
  await addFieldToCollection(targetCollection, inverseFieldMeta);
  console.log(`[Relation Metadata] ✓ Added virtual ${ownership.inverseField} to ${targetCollection}`);

  return {
    sourceField: sourceFieldMeta,
    inverseField: inverseFieldMeta,
    ownership
  };
}

/**
 * Get inverse relation type
 */
function getInverseRelationType(
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'
): 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany' {
  switch (relationType) {
    case 'oneToOne':
      return 'oneToOne';
    case 'oneToMany':
      return 'manyToOne';
    case 'manyToOne':
      return 'oneToMany';
    case 'manyToMany':
      return 'manyToMany';
  }
}

/**
 * Add field to collection metadata
 */
async function addFieldToCollection(
  collectionName: string,
  field: Field
): Promise<void> {
  const collection = await prisma.collectionType.findUnique({
    where: { name: collectionName }
  });

  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  const fields = (collection.fields as any).fields || [];

  // Check if field already exists
  const existingIndex = fields.findIndex((f: Field) => f.name === field.name);
  
  if (existingIndex >= 0) {
    // Update existing field
    fields[existingIndex] = field;
    console.log(`[Relation Metadata] Updated existing field: ${field.name}`);
  } else {
    // Add new field
    fields.push(field);
  }

  await prisma.collectionType.update({
    where: { name: collectionName },
    data: {
      fields: {
        fields
      }
    }
  });
}

/**
 * Remove a relation and its inverse
 */
export async function removeRelation(
  sourceCollection: string,
  sourceField: string
): Promise<void> {
  console.log(`\n[Relation Metadata] Removing relation: ${sourceCollection}.${sourceField}`);

  // Get source collection
  const collection = await prisma.collectionType.findUnique({
    where: { name: sourceCollection }
  });

  if (!collection) {
    throw new Error(`Collection ${sourceCollection} not found`);
  }

  const fields = (collection.fields as any).fields || [];
  const relationField = fields.find((f: Field) => f.name === sourceField && f.type === 'relation');

  if (!relationField || !relationField.relation) {
    throw new Error(`Relation field ${sourceField} not found`);
  }

  const targetCollection = relationField.relation.targetCollection;
  const targetField = relationField.relation.targetField;

  // Remove source field
  await removeFieldFromCollection(sourceCollection, sourceField);
  console.log(`[Relation Metadata] ✓ Removed ${sourceField} from ${sourceCollection}`);

  // Remove inverse field
  await removeFieldFromCollection(targetCollection, targetField);
  console.log(`[Relation Metadata] ✓ Removed ${targetField} from ${targetCollection}`);
}

/**
 * Remove field from collection metadata
 */
async function removeFieldFromCollection(
  collectionName: string,
  fieldName: string
): Promise<void> {
  const collection = await prisma.collectionType.findUnique({
    where: { name: collectionName }
  });

  if (!collection) {
    return;
  }

  const fields = (collection.fields as any).fields || [];
  const updatedFields = fields.filter((f: Field) => f.name !== fieldName);

  await prisma.collectionType.update({
    where: { name: collectionName },
    data: {
      fields: {
        fields: updatedFields
      }
    }
  });
}

/**
 * Get all relations for a collection
 */
export async function getCollectionRelations(
  collectionName: string
): Promise<Field[]> {
  const collection = await prisma.collectionType.findUnique({
    where: { name: collectionName }
  });

  if (!collection) {
    return [];
  }

  const fields = (collection.fields as any).fields || [];
  return fields.filter((f: Field) => f.type === 'relation');
}

/**
 * Check if a field is a virtual relation
 */
export function isVirtualRelation(field: Field): boolean {
  return field.type === 'relation' && field.relation?.isVirtual === true;
}

/**
 * Check if a field owns the foreign key
 */
export function ownsRelation(field: Field): boolean {
  return field.type === 'relation' && field.relation?.isOwner === true;
}
