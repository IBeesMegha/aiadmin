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

type RelationType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';

function isRelationField(field: Field | undefined | null): field is Field & { relation: RelationMetadata } {
  return !!field && field.type === 'relation' && !!field.relation && !!field.relation.targetCollection;
}

function isOwningSide(field: Field): boolean {
  if (!isRelationField(field)) return false;
  return !field.relation.isVirtual;
}

function sourceOwnsForeignKey(type: RelationType): boolean {
  return type === 'manyToOne' || type === 'oneToOne';
}

function defaultInverseFieldName(sourceCollection: string, type: RelationType): string {
  return generateInverseFieldName(sourceCollection, getInverseRelationType(type));
}

function normalizeSourceField(collectionName: string, field: Field): Field {
  const relation = field.relation!;
  const type = relation.type as RelationType;
  const targetField = (relation.targetField || '').trim() || defaultInverseFieldName(collectionName, type);
  return {
    ...field,
    relation: {
      ...relation,
      targetField,
      targetCollectionDisplay: relation.targetCollectionDisplay || relation.targetCollection,
      relationName: relation.relationName || `${toPascalCase(collectionName)}To${toPascalCase(relation.targetCollection)}`,
      isOwner: relation.isOwner ?? sourceOwnsForeignKey(type),
      isVirtual: false,
    },
  };
}

function buildInverseField(sourceCollection: string, sourceField: Field, existing?: Field): Field {
  const relation = sourceField.relation!;
  const type = relation.type as RelationType;
  const inverseType = getInverseRelationType(type);
  const inverseOwnsFk = type === 'oneToMany';
  return {
    name: relation.targetField,
    type: 'relation',
    displayName: existing?.displayName || relation.targetField,
    required: inverseOwnsFk ? existing?.required ?? false : false,
    relation: {
      type: inverseType,
      targetCollection: sourceCollection,
      targetCollectionDisplay: sourceCollection,
      targetField: sourceField.name,
      relationName: relation.relationName,
      isOwner: inverseOwnsFk,
      isVirtual: !inverseOwnsFk,
    },
  };
}

function pointsBackTo(field: Field | undefined, collectionName: string, fieldName: string): boolean {
  return (
    isRelationField(field) &&
    field.relation.targetCollection === collectionName &&
    field.relation.targetField === fieldName
  );
}

function upsertInverse(fields: Field[], sourceCollection: string, sourceField: Field): boolean {
  const inverseName = sourceField.relation!.targetField;
  const index = fields.findIndex(f => f.name === inverseName);
  const existing = index >= 0 ? fields[index] : undefined;

  if (existing && !isRelationField(existing)) {
    console.warn(
      `[Relation Metadata] Cannot create inverse "${inverseName}": a non-relation field with that name already exists`
    );
    return false;
  }

  if (
    existing &&
    isRelationField(existing) &&
    existing.relation.targetCollection !== sourceCollection
  ) {
    console.warn(
      `[Relation Metadata] Cannot create inverse "${inverseName}": field already relates to ${existing.relation.targetCollection}`
    );
    return false;
  }

  const inverse = buildInverseField(sourceCollection, sourceField, existing);
  if (existing && JSON.stringify(existing) === JSON.stringify(inverse)) {
    return false;
  }

  if (index >= 0) {
    fields[index] = inverse;
  } else {
    fields.push(inverse);
  }
  return true;
}

async function loadAllCollections(): Promise<Array<{ name: string; fields: Field[] }>> {
  const collections = await prisma.collectionType.findMany({ select: { name: true, fields: true } });
  return collections.map(c => ({ name: c.name, fields: [...(((c.fields as any)?.fields || []) as Field[])] }));
}

/**
 * Keep both sides of every relation in sync when a collection's fields change.
 *
 * - Owning (non-virtual) relation fields get their inverse field created/updated
 *   on the target collection.
 * - Inverse fields removed by the user are restored as long as the owning side
 *   still exists (delete the relation from the owning side instead).
 * - Relation fields removed from this collection get their inverse removed.
 *
 * Returns the normalized fields for this collection and the other collections
 * whose metadata was modified (their tables may need a schema sync).
 */
export async function syncInverseRelations(
  collectionName: string,
  previousFields: Field[],
  nextFields: Field[],
  previousCollectionName: string = collectionName
): Promise<{ fields: Field[]; affectedCollections: string[] }> {
  const all = await loadAllCollections();
  const others = new Map<string, Field[]>();
  for (const c of all) {
    if (c.name !== collectionName && c.name !== previousCollectionName) {
      others.set(c.name, c.fields);
    }
  }
  const changed = new Set<string>();

  if (previousCollectionName !== collectionName) {
    others.forEach((fields, name) => {
      for (const f of fields) {
        if (isRelationField(f) && f.relation.targetCollection === previousCollectionName) {
          f.relation = { ...f.relation, targetCollection: collectionName, targetCollectionDisplay: collectionName };
          changed.add(name);
        }
      }
    });
  }

  let fields: Field[] = nextFields.map(f => {
    if (!isRelationField(f)) return f;
    const target = f.relation.targetCollection === previousCollectionName ? collectionName : f.relation.targetCollection;
    const withTarget = { ...f, relation: { ...f.relation, targetCollection: target } };
    return isOwningSide(withTarget) ? normalizeSourceField(collectionName, withTarget) : withTarget;
  });

  const nextByName = new Map(fields.map(f => [f.name, f]));

  for (const oldField of previousFields) {
    if (!isRelationField(oldField) || !isOwningSide(oldField)) continue;
    const current = nextByName.get(oldField.name);
    const stillSame =
      isRelationField(current) &&
      isOwningSide(current) &&
      current.relation.targetCollection ===
        (oldField.relation.targetCollection === previousCollectionName ? collectionName : oldField.relation.targetCollection) &&
      current.relation.targetField === oldField.relation.targetField;
    if (stillSame) continue;

    const oldTarget =
      oldField.relation.targetCollection === previousCollectionName ? collectionName : oldField.relation.targetCollection;
    const inverseName = oldField.relation.targetField;
    if (!inverseName) continue;

    if (oldTarget === collectionName) {
      const inverse = fields.find(f => f.name === inverseName);
      if (pointsBackTo(inverse, collectionName, oldField.name)) {
        fields = fields.filter(f => f.name !== inverseName);
      }
      continue;
    }

    const targetFields = others.get(oldTarget);
    if (!targetFields) continue;
    const inverse = targetFields.find(f => f.name === inverseName);
    if (pointsBackTo(inverse, collectionName, oldField.name) || pointsBackTo(inverse, previousCollectionName, oldField.name)) {
      others.set(oldTarget, targetFields.filter(f => f.name !== inverseName));
      changed.add(oldTarget);
      console.log(`[Relation Metadata] Removed inverse ${oldTarget}.${inverseName}`);
    }
  }

  others.forEach((otherFields, otherName) => {
    for (const f of otherFields) {
      if (!isRelationField(f) || !isOwningSide(f)) continue;
      if (f.relation.targetCollection !== collectionName) continue;
      if (f.relation.type === 'oneToMany') continue;
      const normalized = normalizeSourceField(otherName, f);
      upsertInverse(fields, otherName, normalized);
    }
  });

  for (const field of [...fields]) {
    if (!isRelationField(field) || !isOwningSide(field)) continue;
    const target = field.relation.targetCollection;

    if (target === collectionName) {
      upsertInverse(fields, collectionName, field);
      continue;
    }

    const targetFields = others.get(target);
    if (!targetFields) {
      console.warn(`[Relation Metadata] Target collection ${target} not found for ${collectionName}.${field.name}`);
      continue;
    }

    if (upsertInverse(targetFields, collectionName, field)) {
      changed.add(target);
      console.log(`[Relation Metadata] Synced inverse ${target}.${field.relation.targetField}`);
    }
  }

  for (const name of Array.from(changed)) {
    await prisma.collectionType.update({
      where: { name },
      data: { fields: { fields: others.get(name) || [] } as any },
    });
  }

  return { fields, affectedCollections: Array.from(changed) };
}

export async function getCollectionFieldsByName(collectionName: string): Promise<Field[]> {
  const collection = await prisma.collectionType.findUnique({ where: { name: collectionName } });
  return ((collection?.fields as any)?.fields || []) as Field[];
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
