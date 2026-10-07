import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse, Field } from '@/lib/types';
import { createDynamicTable, tableExists, syncTableSchema } from '@/lib/dynamic-table-service';
import { syncInverseRelations } from '@/lib/relation-metadata';
import { syncRelatedCollections } from '@/lib/relation-sync';
import { generateCollectionModule, deleteCollectionModule } from '@/lib/collection-module-generator';

/**
 * Collection Types API - Manages dynamic content type definitions
 * 
 * NEW ARCHITECTURE:
 * - CollectionType metadata is stored in Prisma-managed table
 * - Actual content tables are created via raw SQL at runtime
 * - Relations are metadata-driven with automatic inverse generation
 * - NO Prisma schema modifications
 * - NO migrations needed for content tables
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    if (req.method === 'GET') {
      // Get all collection types
      const collectionTypes = await prisma.collectionType.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json({ data: collectionTypes });
    }

    if (req.method === 'POST') {
      // Create new collection type
      const { name, displayName, description, fields } = req.body;

      if (!name || !displayName || !fields) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
      let collectionType;

      try {
        console.log(`\n=== Creating collection: ${normalizedName} ===`);
        
        // 1. Check if table already exists
        console.log('Step 1: Checking if table exists...');
        if (await tableExists(normalizedName)) {
          return res.status(400).json({ 
            error: `Table for collection "${normalizedName}" already exists` 
          });
        }
        console.log('✓ Table does not exist, proceeding...');

        // 2. Create collection type metadata (WITHOUT relation fields first)
        console.log('Step 2: Creating collection metadata...');
        const nonRelationFields = (fields.fields || []).filter((f: any) => f.type !== 'relation');
        
        collectionType = await prisma.collectionType.create({
          data: {
            name: normalizedName,
            displayName,
            description,
            fields: {
              fields: nonRelationFields
            },
          },
        });
        console.log('✓ Metadata created');

        // 3. Create dynamic table via raw SQL (only non-relation fields)
        console.log('Step 3: Creating dynamic table via raw SQL...');
        await createDynamicTable(normalizedName, nonRelationFields);
        console.log('✓ Dynamic table created');

        // 4. Process relation fields and create inverse relations
        console.log('Step 4: Processing relations...');
        const relationFields = (fields.fields || []).filter((f: any) => f.type === 'relation');
        
        if (relationFields.length > 0) {
          const { fields: syncedFields, affectedCollections } = await syncInverseRelations(
            normalizedName,
            [],
            fields.fields || []
          );

          await prisma.collectionType.update({
            where: { name: normalizedName },
            data: { fields: { fields: syncedFields } as any },
          });

          // 5. Sync table schema to add FK columns for owned relations
          console.log('Step 5: Syncing table schema for FK columns...');
          await syncTableSchema(normalizedName, syncedFields);
          console.log('✓ Table schema synced');

          await syncRelatedCollections(affectedCollections);
        }

        console.log(`\n✓ Collection ${normalizedName} created successfully!`);
        console.log('✓ No server restart needed - table is ready to use\n');

        // Get updated collection with all fields (relations are merged into the
        // metadata by createRelation above)
        const updatedCollection = await prisma.collectionType.findUnique({
          where: { id: collectionType.id }
        });

        // 6. Generate the complete collection module using the actual collection
        //    name from the request (never hardcoded):
        //      models/<name>.model.ts
        //      services/<name>.service.ts
        //      controllers/<name>.controller.ts
        //      pages/api/collections/<name>/{index,[id]}.ts
        //      pages/admin/collections/<name>/{index,new,[id]}.tsx
        console.log('Step 6: Generating collection module (model/service/controller/API/admin)...');
        try {
          const allFields: Field[] = (updatedCollection?.fields as any)?.fields || [];
          await generateCollectionModule({
            collectionName: normalizedName,
            displayName,
            fields: allFields,
          });
          console.log('✓ Collection module generated');
        } catch (error: any) {
          console.error('✗ Failed to generate collection module:', error.message);
          // Don't fail the entire operation, just log the error
        }

        return res.status(201).json({ 
          data: updatedCollection,
          message: 'Collection created successfully. Table and collection module are ready to use.',
          requiresRestart: false
        });
        
      } catch (error: any) {
        console.error('\n✗ Creation failed:', error.message);
        
        // Rollback: delete the collection type if it was created
        if (collectionType) {
          try {
            console.log('Rolling back: Deleting collection metadata...');
            await prisma.collectionType.delete({
              where: { id: collectionType.id },
            });
            console.log('✓ Rollback completed');
          } catch (rollbackError) {
            console.error('✗ Rollback error:', rollbackError);
          }

          // Remove any module files generated for this collection before the failure
          try {
            deleteCollectionModule(normalizedName);
          } catch (cleanupError: any) {
            console.error('✗ Rollback cleanup error:', cleanupError.message);
          }
        }
        
        return res.status(500).json({ 
          error: `Failed to create collection: ${error.message}` 
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Collection Types API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
