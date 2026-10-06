import { Field } from './types';
import { prisma } from './prisma';

/**
 * Handle many-to-many relation updates
 * This function updates the implicit join tables that Prisma creates for many-to-many relations
 */
export async function updateManyToManyRelations(
  tableName: string,
  entryId: string,
  data: Record<string, any>,
  fields: Field[]
): Promise<void> {
  const sanitizedTableName = tableName.toLowerCase().replace(/-/g, '_');
  
  // Find all manyToMany relation fields
  const manyToManyFields = fields.filter(
    (f) => f.type === 'relation' && f.relation?.type === 'manyToMany'
  );

  console.log('[ManyToMany Handler] Processing fields:', manyToManyFields.map(f => f.name));
  console.log('[ManyToMany Handler] Data received:', data);

  for (const field of manyToManyFields) {
    if (!field.relation) continue;
    
    const fieldValue = data[field.name];
    
    // Skip if this field is not in the data
    if (fieldValue === undefined) {
      console.log(`[ManyToMany Handler] Skipping ${field.name} - not in data`);
      continue;
    }

    const targetTable = field.relation.targetCollection.toLowerCase().replace(/-/g, '_');
    const targetIds: string[] = Array.isArray(fieldValue) ? fieldValue : [];

    console.log(`[ManyToMany Handler] Updating ${field.name}:`, {
      sourceTable: sanitizedTableName,
      targetTable,
      entryId,
      targetIds
    });

    try {
      // Prisma uses implicit many-to-many relations
      // The join table is automatically named by Prisma based on the models
      // We need to use Prisma's update with connect/disconnect
      
      // Use dynamic Prisma client access
      const model = (prisma as any)[sanitizedTableName];
      
      if (!model) {
        console.error(`[ManyToMany Handler] Model ${sanitizedTableName} not found in Prisma client`);
        continue;
      }

      // Build the update object with relation field
      const updateData: any = {
        [field.name]: {
          set: targetIds.map(id => ({ id }))
        }
      };

      console.log(`[ManyToMany Handler] Executing update for ${field.name}:`, updateData);

      await model.update({
        where: { id: entryId },
        data: updateData
      });

      console.log(`[ManyToMany Handler] Successfully updated ${field.name}`);
    } catch (error: any) {
      console.error(`[ManyToMany Handler] Error updating ${field.name}:`, error.message);
      throw new Error(`Failed to update ${field.name}: ${error.message}`);
    }
  }
}

/**
 * Extract manyToMany fields from data for separate handling
 * Returns the manyToMany data and the cleaned data without manyToMany fields
 */
export function extractManyToManyData(
  data: Record<string, any>,
  fields: Field[]
): { manyToManyData: Record<string, any>; cleanedData: Record<string, any> } {
  const manyToManyData: Record<string, any> = {};
  const cleanedData: Record<string, any> = {};

  const manyToManyFieldNames = new Set(
    fields
      .filter((f) => f.type === 'relation' && f.relation?.type === 'manyToMany')
      .map((f) => f.name)
  );

  for (const [key, value] of Object.entries(data)) {
    if (manyToManyFieldNames.has(key)) {
      manyToManyData[key] = value;
    } else {
      cleanedData[key] = value;
    }
  }

  return { manyToManyData, cleanedData };
}
