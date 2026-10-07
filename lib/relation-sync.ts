import { prisma } from './prisma';
import { syncTableSchema, tableExists } from './dynamic-table-service';
import { generateCollectionModule } from './collection-module-generator';
import { getCollectionFieldsByName } from './relation-metadata';

export async function syncRelatedCollections(collectionNames: string[]): Promise<void> {
  for (const relatedName of collectionNames) {
    try {
      const relatedFields = await getCollectionFieldsByName(relatedName);
      if (await tableExists(relatedName)) {
        await syncTableSchema(relatedName, relatedFields);
      }
      const related = await prisma.collectionType.findUnique({ where: { name: relatedName } });
      await generateCollectionModule({
        collectionName: relatedName,
        displayName: related?.displayName || relatedName,
        fields: relatedFields,
        includeAdminPages: false,
      });
      console.log(`✓ Synced related collection ${relatedName}`);
    } catch (error: any) {
      console.error(`✗ Failed to sync related collection ${relatedName}:`, error.message);
    }
  }
}
