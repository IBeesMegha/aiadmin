import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { findUniqueDynamic, findManyDynamic, updateDynamic, deleteDynamic } from '@/lib/dynamic-prisma';
import { ApiResponse, Field } from '@/lib/types';
import { filterVirtualRelationFields } from '@/lib/relation-engine';
import { populateComponents, createComponentEntry } from '@/lib/component-populate';
import { populateRelations } from '@/lib/relation-populate';
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { name, id, populate } = req.query;

  if (typeof name !== 'string' || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    // Verify collection type exists
    const collectionType = await prisma.collectionType.findUnique({
      where: { name },
    });

    if (!collectionType) {
      return res.status(404).json({ error: 'Collection type not found' });
    }

    const fields = (collectionType.fields as any)?.fields || [];

    if (req.method === 'GET') {
      // Get specific entry from dynamic table
      let entries: any = await findUniqueDynamic(name, id);
      
      if (!entries || entries.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      let entry = entries[0];

      // Convert field names from database format back to collection type format
      // Use exact field names - no conversion
      const convertedEntry: Record<string, any> = { ...entry };

      console.log('[API GET] Entry data:', convertedEntry);

      // ALWAYS populate relations automatically
      let finalEntry = await populateRelations(convertedEntry, name, fields);

      // Populate components if requested
      if (populate === 'true') {
        finalEntry = await populateComponents(finalEntry, fields);
      }

      return res.status(200).json({ data: finalEntry });
    }

    if (req.method === 'PUT') {
      // Update entry in dynamic table
      const { data: entryData } = req.body;

      console.log('[API PUT] Received data:', entryData);

      if (!entryData || Object.keys(entryData).length === 0) {
        return res.status(400).json({ error: 'Missing entry data' });
      }

      console.log('[API PUT] Collection fields:', fields.map((f: any) => ({ name: f.name, type: f.type })));

      // Convert field names from collection type format to database format
      // Use exact field names - no conversion
      const convertedData: Record<string, any> = {};
      Object.keys(entryData).forEach(key => {
        // Use the exact key as provided - no sanitization
        convertedData[key] = entryData[key];
        console.log(`[API PUT] Field: ${key} = ${entryData[key]}`);
      });

      console.log('[API PUT] Data to update:', convertedData);

      // Check for unique field violations (excluding current entry)
      for (const field of fields) {
        if (field.unique && convertedData[field.name] !== undefined && convertedData[field.name] !== null && convertedData[field.name] !== '') {
          const fieldName = field.name; // Use exact field name

          console.log(`[API PUT] Checking uniqueness for field: ${fieldName}, value: ${convertedData[fieldName]}`);

          const existingEntries = await findManyDynamic(name, {
            where: {
              [fieldName]: convertedData[fieldName]
            }
          }) as any[];

          console.log(`[API PUT] Found ${existingEntries.length} existing entries with same value`);

          // Check if any existing entry has the same value (excluding current entry being updated)
          const duplicateEntry = existingEntries.find((entry: any) => entry.id !== id);
          if (duplicateEntry) {
            console.log(`[API PUT] Duplicate found: entry ${duplicateEntry.id} has same ${field.displayName}`);
            return res.status(400).json({ 
              error: `This ${field.displayName} already exists. The field "${field.displayName}" must be unique.` 
            });
          }
        }
      }

      // Process component fields - create component entries if needed
      const processedData = await processComponentFields(convertedData, fields);
      
      // Extract manyToMany fields for separate handling
      const { extractManyToManyData } = await import('@/lib/many-to-many-handler');
      const { manyToManyData, cleanedData: dataWithoutManyToMany } = extractManyToManyData(processedData, fields);
      
      console.log('[API PUT] ManyToMany data:', manyToManyData);
      console.log('[API PUT] Data without ManyToMany:', dataWithoutManyToMany);
      
      // Filter out virtual relation fields (like "products" in ProductCategory)
      // Only keep physical columns (like "categoryId" in Product)
      const filteredData = filterVirtualRelationFields(fields, dataWithoutManyToMany);

      console.log('[API PUT] Filtered data:', filteredData);

      // Prepare data for update
      const dataToUpdate: Record<string, any> = {
        ...filteredData,
      };

      // Remove undefined values
      Object.keys(dataToUpdate).forEach(key => {
        if (dataToUpdate[key] === undefined) {
          delete dataToUpdate[key];
        }
      });

      const entry = await updateDynamic(name, id, dataToUpdate);
      
      // Handle manyToMany relations separately after the main update
      if (Object.keys(manyToManyData).length > 0) {
        console.log('[API PUT] Updating manyToMany relations:', manyToManyData);
        const { updateManyToManyRelations } = await import('@/lib/many-to-many-handler');
        await updateManyToManyRelations(name, id, manyToManyData, fields);
      }
      
      return res.status(200).json({ data: entry });
    }

    if (req.method === 'DELETE') {
      // Delete entry from dynamic table
      await deleteDynamic(name, id);
      return res.status(200).json({ message: 'Entry deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Collection Entry API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export default authMiddleware(handler);

/**
 * Process component fields in entry data
 * Creates component entries for inline component data
 */
async function processComponentFields(
  data: Record<string, any>,
  fields: Field[]
): Promise<Record<string, any>> {
  const processed = { ...data };

  for (const field of fields) {
    if (field.type !== 'component') continue;

    const value = data[field.name];
    if (!value) continue;

    try {
      if (field.multiple) {
        // Repeatable component
        if (Array.isArray(value)) {
          processed[field.name] = await Promise.all(
            value.map(item => processComponentValue(item, field.componentRef!))
          );
        }
      } else {
        // Single component
        processed[field.name] = await processComponentValue(value, field.componentRef!);
      }
    } catch (error) {
      console.error(`[Process Components] Error processing field ${field.name}:`, error);
      // Keep original value on error
    }
  }

  return processed;
}

/**
 * Process a single component value
 * If it's an object without ID, create a new component entry
 */
async function processComponentValue(value: any, componentName: string): Promise<string> {
  // Already a reference (string ID)
  if (typeof value === 'string') {
    return value;
  }

  // Object with ID (reference object)
  if (typeof value === 'object' && value.id) {
    return value.id;
  }

  // Object without ID - create new component entry
  if (typeof value === 'object' && !value.id) {
    const entry = await createComponentEntry(componentName, value);
    return entry.id;
  }

  throw new Error(`Invalid component value: ${JSON.stringify(value)}`);
}
