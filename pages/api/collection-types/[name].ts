import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ApiResponse, Field } from '@/lib/types';
import { syncInverseRelations } from '@/lib/relation-metadata';
import { syncRelatedCollections } from '@/lib/relation-sync';
import { 
  dropDynamicTable, 
  renameDynamicTable,
  syncTableSchema, 
  tableExists 
} from '@/lib/dynamic-table-service';
import {
  deleteCollectionModule,
  generateCollectionModule,
  renameCollectionModule,
} from '@/lib/collection-module-generator';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid collection type name' });
  }

  try {
    if (req.method === 'GET') {
      // Get specific collection type
      const collectionType = await prisma.collectionType.findUnique({
        where: { name },
      });

      if (!collectionType) {
        return res.status(404).json({ error: 'Collection type not found' });
      }

      return res.status(200).json({ data: collectionType });
    }

    if (req.method === 'PUT') {
      // Update collection type with automatic schema synchronization
      const { displayName, description, fields, name: newName } = req.body;

      if (!fields || !fields.fields || fields.fields.length === 0) {
        return res.status(400).json({ error: 'At least one field is required' });
      }

      try {
        console.log(`\n=== Updating collection: ${name} ===`);
        
        // Check if collection name is being changed
        const isRenaming = newName && newName !== name;
        const targetName = isRenaming ? newName.toLowerCase().replace(/\s+/g, '-') : name;

        const existing = await prisma.collectionType.findUnique({ where: { name } });
        if (!existing) {
          return res.status(404).json({ error: 'Collection type not found' });
        }
        const previousFields: Field[] = (existing.fields as any)?.fields || [];

        console.log('Step 0: Synchronizing bidirectional relations...');
        const { fields: syncedFields, affectedCollections } = await syncInverseRelations(
          targetName,
          previousFields,
          fields.fields,
          name
        );
        fields.fields = syncedFields;
        
        // 1. Update the collection metadata in database
        console.log('Step 1: Updating collection metadata...');
        const updateData: any = {
          displayName,
          description,
          fields,
        };
        
        // If renaming, include the new name
        if (isRenaming) {
          updateData.name = targetName;
        }
        
        const collectionType = await prisma.collectionType.update({
          where: { name },
          data: updateData,
        });
        console.log('✓ Metadata updated');

        // 2. Rename the dynamic table when the collection name changes, then
        //    sync the table schema with the new fields (add/remove columns as needed)
        const finalName = isRenaming ? updateData.name : name;
        if (isRenaming) {
          console.log('Step 2: Renaming dynamic table...');
          await renameDynamicTable(name, finalName);
          console.log('✓ Table renamed');
        }
        console.log('Step 3: Synchronizing table schema...');
        await syncTableSchema(finalName, fields.fields);
        console.log('✓ Table schema synchronized');

        await syncRelatedCollections(affectedCollections);

        // 4. Regenerate the collection module so the model, service, controller,
        //    API routes and (on rename) admin pages carry the new collection name,
        //    fields and internal collection references.
        console.log('Step 4: Regenerating collection module...');
        try {
          const updatedCollection = await prisma.collectionType.findUnique({
            where: { name: finalName },
          });
          const updatedFields = (updatedCollection?.fields as any)?.fields || [];

          if (isRenaming) {
            // Generates the module under the new name (all internal references
            // updated) and removes every file generated for the old name.
            await renameCollectionModule({
              oldName: name,
              newName: finalName,
              displayName: displayName || updatedCollection?.displayName || finalName,
              fields: updatedFields,
            });
          } else {
            await generateCollectionModule({
              collectionName: name,
              displayName: displayName || updatedCollection?.displayName || name,
              fields: updatedFields,
              // Admin pages are preserved unless the collection is renamed
              includeAdminPages: false,
            });
          }
          console.log('✓ Collection module regenerated');
        } catch (error: any) {
          console.error('✗ Failed to regenerate collection module:', error.message);
          // Don't fail the entire operation
        }

        console.log(`\n✓ Collection ${finalName} updated successfully!`);
        console.log('✓ No server restart needed - changes are live\n');
        
        return res.status(200).json({ 
          data: collectionType,
          message: 'Collection updated successfully. Changes are live.',
          requiresRestart: false
        });
        
      } catch (error: any) {
        console.error('\n✗ Update failed:', error.message);
        
        return res.status(500).json({ 
          error: `Failed to update collection: ${error.message}` 
        });
      }
    }

    if (req.method === 'DELETE') {
      // Delete collection type and drop its table
      try {
        console.log(`\n=== Deleting collection: ${name} ===`);
        
        // 1. Delete collection type metadata
        console.log('Step 1: Deleting collection metadata...');
        await prisma.collectionType.delete({
          where: { name },
        });
        console.log('✓ Metadata deleted');

        // 2. Drop the dynamic table
        console.log('Step 2: Dropping dynamic table...');
        await dropDynamicTable(name);
        console.log('✓ Table dropped');

        // 3. Delete every generated file of this collection
        //    (model, service, controller, API routes and admin pages)
        console.log('Step 3: Deleting generated collection module...');
        try {
          deleteCollectionModule(name);
          console.log('✓ Collection module deleted');
        } catch (error: any) {
          console.error('✗ Failed to delete collection module:', error.message);
          // Don't fail the entire operation
        }

        console.log(`\n✓ Collection ${name} deleted successfully!\n`);

        return res.status(200).json({ 
          message: 'Collection deleted successfully.',
          requiresRestart: false
        });
      } catch (error: any) {
        console.error('\n✗ Deletion failed:', error.message);
        return res.status(500).json({ 
          error: `Failed to delete collection: ${error.message}` 
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Collection Type API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
