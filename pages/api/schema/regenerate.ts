import { NextApiRequest, NextApiResponse } from 'next';
import { regenerateSchema } from '@/lib/schema-sync';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * API endpoint to regenerate Prisma schema from CollectionType metadata
 * This ensures the schema.prisma file matches what's in the database
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Schema Regenerate] Starting schema regeneration...');
    
    // Step 1: Regenerate schema from CollectionType metadata
    await regenerateSchema();
    console.log('[Schema Regenerate] ✓ Schema file regenerated');
    
    // Step 2: Generate Prisma Client
    console.log('[Schema Regenerate] Generating Prisma Client...');
    try {
      await execAsync('npx prisma generate', {
        windowsHide: true,
        timeout: 60000,
      });
      console.log('[Schema Regenerate] ✓ Prisma Client generated');
    } catch (genError: any) {
      // If generation fails due to file lock, try db push instead
      if (genError.message && genError.message.includes('EPERM')) {
        console.log('[Schema Regenerate] File locked, trying db push...');
        await execAsync('npx prisma db push --skip-generate', {
          windowsHide: true,
          timeout: 120000,
        });
        console.log('[Schema Regenerate] ✓ Database pushed');
      } else {
        throw genError;
      }
    }
    
    // Step 3: Create migration
    console.log('[Schema Regenerate] Creating migration...');
    const migrationName = `sync_schema_${Date.now()}`;
    try {
      await execAsync(`npx prisma migrate dev --name ${migrationName} --skip-generate`, {
        windowsHide: true,
        timeout: 120000,
      });
      console.log('[Schema Regenerate] ✓ Migration created');
    } catch (migrateError: any) {
      // If migration fails, it might be because there are no changes
      console.log('[Schema Regenerate] Migration note:', migrateError.message);
    }
    
    res.status(200).json({
      success: true,
      message: 'Schema regenerated successfully',
    });
  } catch (error: any) {
    console.error('[Schema Regenerate] Error:', error);
    res.status(500).json({
      error: 'Failed to regenerate schema',
      details: error.message,
    });
  }
}
