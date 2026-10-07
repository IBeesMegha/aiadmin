/**
 * Schema Synchronization Engine
 *
 * The Prisma schema contains ONLY core tables (auth, RBAC, languages, media and
 * the Content Type Builder metadata tables).
 *
 * Collection tables created through the Content Type Builder are managed at
 * runtime with raw SQL (lib/dynamic-table-service.ts, lib/junction-table-service.ts)
 * and must NEVER be written into schema.prisma or created by Prisma migrations.
 */

import fs from 'fs/promises';
import path from 'path';

const DYNAMIC_MODELS_MARKER = '// Dynamic Collection Types';

/**
 * Strip any generated dynamic collection models from schema.prisma,
 * keeping the hand-maintained core schema intact.
 */
export async function regenerateSchema(): Promise<void> {
  console.log('Checking Prisma schema for dynamic collection models...');

  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const current = await fs.readFile(schemaPath, 'utf-8');

  const markerIndex = current.indexOf(DYNAMIC_MODELS_MARKER);
  const cleaned =
    markerIndex >= 0
      ? current.slice(0, markerIndex).replace(/\s+$/, '') + '\n'
      : current;

  if (cleaned !== current) {
    await fs.writeFile(schemaPath, cleaned, 'utf-8');
    console.log('✓ Removed dynamic collection models from schema.prisma');
  } else {
    console.log('✓ Schema is clean (no dynamic collection models)');
  }
}

/**
 * Validate generated schema
 */
export async function validateSchema(): Promise<{ valid: boolean; error?: string }> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    await execAsync('npx prisma validate', {
      windowsHide: true,
      timeout: 30000,
    });

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Schema validation failed',
    };
  }
}
