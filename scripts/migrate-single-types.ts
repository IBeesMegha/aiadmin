/**
 * Idempotent migration for single types.
 *
 * - assigns a generated table name to every definition
 * - creates the generated table and its i18n/system columns when missing
 * - imports legacy `SingleType.data` (plain or `__i18n`) into per-language rows
 * - always guarantees an English row
 *
 * Safe to re-run: existing rows are never overwritten, and only missing
 * languages are imported.
 */
import { prisma } from '../lib/prisma';
import { prisma as dynamicPrisma } from '../lib/dynamic-prisma';
import { migrateAllSingleTypes } from '../lib/single-type-service';

async function main() {
  const results = await migrateAllSingleTypes();

  console.log('\nSingle type migration complete:');
  if (results.length === 0) {
    console.log('  No single types found.');
  } else {
    for (const result of results) {
      console.log(
        `  ${result.name} -> "${result.tableName}" ` +
          `(rows: ${result.rowCount}, locales: ${result.availableLocales.join(', ')})`
      );
    }
  }
  console.log('');
}

main()
  .catch((error) => {
    console.error('[Single Types Migration] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([
      prisma.$disconnect(),
      dynamicPrisma.$disconnect(),
    ]);
  });
