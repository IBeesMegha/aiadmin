/**
 * Component Population System
 * 
 * Automatically populates component references with actual data
 * Supports:
 * - Single components
 * - Repeatable components (arrays)
 * - Nested components (recursive)
 * - Circular reference detection
 */

import { prisma } from './prisma';
import {
  ComponentReference,
  RepeatableComponentReference,
  PopulatedComponent,
  PopulateOptions,
  ComponentEntry,
} from './component-types';
import { Field } from './types';

// ============================================
// Main Population Functions
// ============================================

/**
 * Populate all component fields in an entry
 * 
 * @param entry - The collection/page entry with component references
 * @param fields - Field definitions from the collection type
 * @param options - Population options
 * @returns Entry with populated components
 */
export async function populateComponents(
  entry: Record<string, any>,
  fields: Field[],
  options: PopulateOptions = {}
): Promise<Record<string, any>> {
  const { maxDepth = 5 } = options;
  
  if (maxDepth <= 0) {
    console.warn('[Populate] Max depth reached, stopping recursion');
    return entry;
  }

  const populatedEntry = { ...entry };
  const visitedIds = new Set<string>(); // Circular reference detection

  // Find all component fields
  const componentFields = fields.filter(f => f.type === 'component');

  for (const field of componentFields) {
    const fieldValue = entry[field.name];
    
    if (!fieldValue) continue;

    try {
      if (field.multiple) {
        // Repeatable component (array)
        populatedEntry[field.name] = await populateRepeatableComponent(
          fieldValue,
          field.componentRef!,
          visitedIds,
          { ...options, maxDepth: maxDepth - 1 }
        );
      } else {
        // Single component
        populatedEntry[field.name] = await populateSingleComponent(
          fieldValue,
          field.componentRef!,
          visitedIds,
          { ...options, maxDepth: maxDepth - 1 }
        );
      }
    } catch (error) {
      console.error(`[Populate] Error populating field ${field.name}:`, error);
      // Keep original value on error
      populatedEntry[field.name] = fieldValue;
    }
  }

  return populatedEntry;
}

/**
 * Populate a single component reference
 */
async function populateSingleComponent(
  reference: ComponentReference,
  componentName: string,
  visitedIds: Set<string>,
  options: PopulateOptions
): Promise<PopulatedComponent | null> {
  const entryId = extractEntryId(reference);
  
  if (!entryId) {
    console.warn('[Populate] Invalid component reference:', reference);
    return null;
  }

  // Circular reference check
  if (visitedIds.has(entryId)) {
    console.warn('[Populate] Circular reference detected:', entryId);
    return { id: entryId, component: componentName, _circular: true } as any;
  }

  visitedIds.add(entryId);

  try {
    const componentEntry = await prisma.componentEntry.findUnique({
      where: { id: entryId },
      include: {
        component: true,
      },
    });

    if (!componentEntry) {
      console.warn('[Populate] Component entry not found:', entryId);
      return null;
    }

    // Build populated component
    const populated: PopulatedComponent = {
      id: componentEntry.id,
      component: componentEntry.component.name,
      ...(componentEntry.data as Record<string, any>),
    };

    // Recursively populate nested components
    const componentFields = (componentEntry.component.fields as any)?.fields || [];
    const nestedComponentFields = componentFields.filter((f: Field) => f.type === 'component');

    if (nestedComponentFields.length > 0 && options.maxDepth! > 0) {
      for (const nestedField of nestedComponentFields) {
        const nestedValue = populated[nestedField.name];
        
        if (!nestedValue) continue;

        if (nestedField.multiple) {
          populated[nestedField.name] = await populateRepeatableComponent(
            nestedValue,
            nestedField.componentRef!,
            new Set(visitedIds), // Clone visited set for this branch
            { ...options, maxDepth: options.maxDepth! - 1 }
          );
        } else {
          populated[nestedField.name] = await populateSingleComponent(
            nestedValue,
            nestedField.componentRef!,
            new Set(visitedIds), // Clone visited set for this branch
            { ...options, maxDepth: options.maxDepth! - 1 }
          );
        }
      }
    }

    return populated;
  } catch (error) {
    console.error('[Populate] Error fetching component entry:', error);
    return null;
  }
}

/**
 * Populate repeatable component references (array)
 */
async function populateRepeatableComponent(
  references: RepeatableComponentReference,
  componentName: string,
  visitedIds: Set<string>,
  options: PopulateOptions
): Promise<PopulatedComponent[]> {
  if (!Array.isArray(references)) {
    console.warn('[Populate] Expected array for repeatable component:', references);
    return [];
  }

  const populated: PopulatedComponent[] = [];

  for (const reference of references) {
    const result = await populateSingleComponent(
      reference,
      componentName,
      new Set(visitedIds), // Clone for each item
      options
    );
    
    if (result) {
      populated.push(result);
    }
  }

  return populated;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract entry ID from various reference formats
 */
function extractEntryId(reference: ComponentReference): string | null {
  if (typeof reference === 'string') {
    return reference;
  }
  
  if (typeof reference === 'object' && reference.id) {
    return reference.id;
  }
  
  return null;
}

/**
 * Normalize component reference to standard format
 */
export function normalizeComponentReference(
  reference: any,
  componentName: string
): ComponentReference {
  if (typeof reference === 'string') {
    return reference;
  }
  
  if (typeof reference === 'object' && reference.id) {
    return {
      id: reference.id,
      component: componentName,
    };
  }
  
  throw new Error(`Invalid component reference: ${JSON.stringify(reference)}`);
}

/**
 * Validate component reference
 */
export function isValidComponentReference(reference: any): boolean {
  if (typeof reference === 'string' && reference.length > 0) {
    return true;
  }
  
  if (typeof reference === 'object' && reference.id && typeof reference.id === 'string') {
    return true;
  }
  
  return false;
}

// ============================================
// Component Entry CRUD Operations
// ============================================

/**
 * Create a new component entry
 */
export async function createComponentEntry(
  componentName: string,
  data: Record<string, any>
): Promise<ComponentEntry> {
  // Get component definition
  const component = await prisma.component.findUnique({
    where: { name: componentName },
  });

  if (!component) {
    throw new Error(`Component "${componentName}" not found`);
  }

  // Validate data against component fields
  const fields = (component.fields as any)?.fields || [];
  const validatedData = await validateAndProcessComponentData(data, fields);

  // Create component entry
  const entry = await prisma.componentEntry.create({
    data: {
      componentId: component.id,
      data: validatedData,
    },
    include: {
      component: true,
    },
  });

  // Cast the entry to ComponentEntry with proper types
  return {
    ...entry,
    component: {
      ...entry.component,
      fields: entry.component.fields as unknown as { fields: Field[] },
    },
  } as ComponentEntry;
}

/**
 * Update a component entry
 */
export async function updateComponentEntry(
  entryId: string,
  data: Record<string, any>
): Promise<ComponentEntry> {
  // Get existing entry with component definition
  const existingEntry = await prisma.componentEntry.findUnique({
    where: { id: entryId },
    include: { component: true },
  });

  if (!existingEntry) {
    throw new Error(`Component entry "${entryId}" not found`);
  }

  // Validate data
  const fields = (existingEntry.component.fields as any)?.fields || [];
  const validatedData = await validateAndProcessComponentData(data, fields);

  // Update entry
  const entry = await prisma.componentEntry.update({
    where: { id: entryId },
    data: {
      data: validatedData,
    },
    include: {
      component: true,
    },
  });

  // Cast the entry to ComponentEntry with proper types
  return {
    ...entry,
    component: {
      ...entry.component,
      fields: entry.component.fields as unknown as { fields: Field[] },
    },
  } as ComponentEntry;
}

/**
 * Delete a component entry
 */
export async function deleteComponentEntry(entryId: string): Promise<void> {
  await prisma.componentEntry.delete({
    where: { id: entryId },
  });
}

/**
 * Get component entry by ID
 */
export async function getComponentEntry(
  entryId: string,
  populate: boolean = false,
  options: PopulateOptions = {}
): Promise<ComponentEntry | null> {
  const entry = await prisma.componentEntry.findUnique({
    where: { id: entryId },
    include: {
      component: true,
    },
  });

  if (!entry) {
    return null;
  }

  if (populate) {
    const fields = (entry.component.fields as any)?.fields || [];
    const populatedData = await populateComponents(
      entry.data as Record<string, any>,
      fields,
      options
    );
    
    return {
      ...entry,
      component: {
        ...entry.component,
        fields: entry.component.fields as unknown as { fields: Field[] },
      },
      data: populatedData,
    } as ComponentEntry;
  }

  // Cast the entry to ComponentEntry with proper types
  return {
    ...entry,
    component: {
      ...entry.component,
      fields: entry.component.fields as unknown as { fields: Field[] },
    },
  } as ComponentEntry;
}

/**
 * Validate and process component data
 * Handles nested component creation
 */
async function validateAndProcessComponentData(
  data: Record<string, any>,
  fields: Field[]
): Promise<Record<string, any>> {
  const processedData: Record<string, any> = {};

  for (const field of fields) {
    const value = data[field.name];

    // Skip undefined values
    if (value === undefined) {
      if (field.required) {
        throw new Error(`Required field "${field.name}" is missing`);
      }
      continue;
    }

    // Handle component fields
    if (field.type === 'component') {
      if (field.multiple) {
        // Repeatable component
        if (!Array.isArray(value)) {
          throw new Error(`Field "${field.name}" must be an array`);
        }
        
        processedData[field.name] = await Promise.all(
          value.map(item => processComponentValue(item, field.componentRef!))
        );
      } else {
        // Single component
        processedData[field.name] = await processComponentValue(value, field.componentRef!);
      }
    } else {
      // Regular field - store as-is
      processedData[field.name] = value;
    }
  }

  return processedData;
}

/**
 * Process a component value (create entry if needed)
 */
async function processComponentValue(
  value: any,
  componentName: string
): Promise<string> {
  // If it's already a reference (string ID), return it
  if (typeof value === 'string') {
    return value;
  }

  // If it's an object with id, return the id
  if (typeof value === 'object' && value.id) {
    return value.id;
  }

  // If it's an object with data, create a new component entry
  if (typeof value === 'object' && !value.id) {
    const entry = await createComponentEntry(componentName, value);
    return entry.id;
  }

  throw new Error(`Invalid component value: ${JSON.stringify(value)}`);
}

// ============================================
// Batch Operations
// ============================================

/**
 * Populate multiple entries at once
 */
export async function populateMultipleEntries(
  entries: Record<string, any>[],
  fields: Field[],
  options: PopulateOptions = {}
): Promise<Record<string, any>[]> {
  return Promise.all(
    entries.map(entry => populateComponents(entry, fields, options))
  );
}

/**
 * Get all entries for a component
 */
export async function getComponentEntries(
  componentName: string,
  populate: boolean = false,
  options: PopulateOptions = {}
): Promise<ComponentEntry[]> {
  const component = await prisma.component.findUnique({
    where: { name: componentName },
  });

  if (!component) {
    throw new Error(`Component "${componentName}" not found`);
  }

  const entries = await prisma.componentEntry.findMany({
    where: { componentId: component.id },
    include: { component: true },
    orderBy: { createdAt: 'desc' },
  });

  if (populate) {
    const fields = (component.fields as any)?.fields || [];
    
    return Promise.all(
      entries.map(async entry => ({
        ...entry,
        component: {
          ...entry.component,
          fields: entry.component.fields as unknown as { fields: Field[] },
        },
        data: await populateComponents(
          entry.data as Record<string, any>,
          fields,
          options
        ),
      }))
    ) as Promise<ComponentEntry[]>;
  }

  // Cast entries to ComponentEntry[] with proper types
  return entries.map(entry => ({
    ...entry,
    component: {
      ...entry.component,
      fields: entry.component.fields as unknown as { fields: Field[] },
    },
  })) as ComponentEntry[];
}
