import { NextApiRequest, NextApiResponse } from 'next';
import { regenerateSchema } from '@/lib/schema-sync';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * API endpoint to synchronize the Prisma schema with the Content Type Builder.
 * Removes any dynamically generated collection models from schema.prisma and
 * regenerates the Prisma Client. Dynamic content tables are created at runtime
 * via raw SQL and are intentionally never part of Prisma migrations.
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
    
    // Step 1: Remove any dynamic collection models from the schema file
    await regenerateSchema();
    console.log('[Schema Regenerate] ✓ Schema file synchronized');
    
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
