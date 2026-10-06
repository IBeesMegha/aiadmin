import { Field } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Generate Prisma model definition from fields
 */
export function generatePrismaModel(
  collectionName: string,
  fields: Field[]
): string {
  const modelName = toPascalCase(collectionName);
  const tableName = collectionName.toLowerCase().replace(/-/g, '_');
  
  let modelDef = `model ${modelName} {\n`;
  modelDef += `  id        String   @id @default(cuid())\n`;
  
  // Add custom fields
  fields.forEach(field => {
    if (field.type === 'relation') {
      // Handle relation fields
      const targetModel = toPascalCase(field.relation!.targetCollection);
      const sanitizedFieldName = sanitizeFieldName(field.name);
      
      switch (field.relation!.type) {
        case 'oneToOne':
          // One-to-one: Store foreign key
          modelDef += `  ${sanitizedFieldName}Id String?   @unique\n`;
          modelDef += `  ${sanitizedFieldName}   ${targetModel}? @relation(fields: [${sanitizedFieldName}Id], references: [id])\n`;
          break;
        case 'manyToOne':
          // Many-to-one: Store foreign key
          modelDef += `  ${sanitizedFieldName}Id String?\n`;
          modelDef += `  ${sanitizedFieldName}   ${targetModel}? @relation("${modelName}To${targetModel}", fields: [${sanitizedFieldName}Id], references: [id])\n`;
          break;
        case 'oneToMany':
          // One-to-many: No foreign key here, just the relation
          modelDef += `  ${sanitizedFieldName}   ${targetModel}[] @relation("${targetModel}To${modelName}")\n`;
          break;
        case 'manyToMany':
          // Many-to-many: Prisma implicit relation
          modelDef += `  ${sanitizedFieldName}   ${targetModel}[]\n`;
          break;
      }
    } else {
      // Handle regular fields
      const prismaType = fieldTypeToPrismaType(field.type, field.multiple);
      const optional = field.required ? '' : '?';
      const unique = field.unique ? ' @unique' : '';
      const sanitizedFieldName = sanitizeFieldName(field.name);
      
      // Add @map if the sanitized name differs from original
      const mapAttribute = sanitizedFieldName !== field.name ? ` @map("${field.name}")` : '';
      
      modelDef += `  ${sanitizedFieldName}  ${prismaType}${optional}${unique}${mapAttribute}\n`;
    }
  });
  
  // Add metadata fields
  modelDef += `  createdAt DateTime @default(now())\n`;
  modelDef += `  updatedAt DateTime @updatedAt\n`;
  
  // Add table mapping to ensure lowercase table name
  modelDef += `\n  @@map("${tableName}")\n`;
  modelDef += `}\n`;
  
  return modelDef;
}

/**
 * Convert field type to Prisma type
 */
function fieldTypeToPrismaType(fieldType: string, multiple?: boolean): string {
  const typeMap: Record<string, string> = {
    'string': 'String',
    'text': 'String',
    'richtext': 'String',
    'richtext-ckeditor': 'String',
    'number': 'Float',
    'boolean': 'Boolean',
    'date': 'DateTime',
    'email': 'String',
    'json': 'Json',
    'component': 'Json',
    'dynamiczone': 'Json', // Dynamic zones store component instances as JSON
  };
  
  // Handle media fields based on multiple property
  if (fieldType === 'media') {
    return multiple ? 'Json' : 'String'; // Array of media URLs stored as JSON, single as String
  }
  
  return typeMap[fieldType] || 'String';
}

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Sanitize field name to be Prisma-compatible
 * Converts kebab-case or spaces to camelCase
 * Removes special characters except underscores
 */
function sanitizeFieldName(fieldName: string): string {
  // Replace spaces and hyphens with underscores temporarily
  let sanitized = fieldName
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, ''); // Remove special chars except underscore
  
  // Convert to camelCase
  const parts = sanitized.split('_').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return 'field';
  }
  
  // First part lowercase, rest capitalized
  return parts[0].toLowerCase() + parts.slice(1).map(part => 
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join('');
}

/**
 * Read current Prisma schema
 */
export async function readPrismaSchema(): Promise<string> {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  return await fs.readFile(schemaPath, 'utf-8');
}

/**
 * Write updated Prisma schema
 */
export async function writePrismaSchema(content: string): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  await fs.writeFile(schemaPath, content, 'utf-8');
}

/**
 * Add opposite relation field to target model
 */
export async function addOppositeRelationField(
  sourceModel: string,
  targetModel: string,
  relationType: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany',
  targetFieldName: string
): Promise<void> {
  const currentSchema = await readPrismaSchema();
  const targetModelName = toPascalCase(targetModel);
  const sourceModelName = toPascalCase(sourceModel);
  
  // Find the target model in the schema
  const modelRegex = new RegExp(`model ${targetModelName} \\{([^}]+)\\}`, 's');
  const match = currentSchema.match(modelRegex);
  
  if (!match) {
    console.warn(`Target model ${targetModelName} not found in schema`);
    return;
  }
  
  const modelContent = match[1];
  
  // Check if opposite relation already exists
  if (modelContent.includes(targetFieldName)) {
    console.log(`Opposite relation field ${targetFieldName} already exists`);
    return;
  }
  
  // Generate opposite relation field based on relation type
  let oppositeField = '';
  const sanitizedFieldName = sanitizeFieldName(targetFieldName);
  
  switch (relationType) {
    case 'oneToOne':
      // Target side of one-to-one
      oppositeField = `  ${sanitizedFieldName}   ${sourceModelName}?\n`;
      break;
    case 'oneToMany':
      // Target side of one-to-many (many-to-one from target's perspective)
      oppositeField = `  ${sanitizedFieldName}Id String?\n`;
      oppositeField += `  ${sanitizedFieldName}   ${sourceModelName}? @relation("${sourceModelName}To${targetModelName}", fields: [${sanitizedFieldName}Id], references: [id])\n`;
      break;
    case 'manyToOne':
      // Target side of many-to-one (one-to-many from target's perspective)
      oppositeField = `  ${sanitizedFieldName}   ${sourceModelName}[] @relation("${sourceModelName}To${targetModelName}")\n`;
      break;
    case 'manyToMany':
      // Target side of many-to-many
      oppositeField = `  ${sanitizedFieldName}   ${sourceModelName}[]\n`;
      break;
  }
  
  // Insert the opposite field before metadata fields
  const lines = modelContent.split('\n');
  let insertIndex = -1;
  
  // Find where to insert (before createdAt, updatedAt, or @@map)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('createdAt') ||
        trimmed.startsWith('updatedAt') ||
        trimmed.startsWith('@@map')) {
      insertIndex = i;
      break;
    }
  }
  
  if (insertIndex === -1) {
    insertIndex = lines.length - 1;
  }
  
  // Insert the opposite field
  const updatedLines = [
    ...lines.slice(0, insertIndex),
    oppositeField.trimEnd(),
    ...lines.slice(insertIndex)
  ];
  
  const updatedModelContent = updatedLines.join('\n');
  const updatedModel = `model ${targetModelName} {${updatedModelContent}}`;
  
  // Replace the model in the schema
  const updatedSchema = currentSchema.replace(modelRegex, updatedModel);
  await writePrismaSchema(updatedSchema);
  
  console.log(`✓ Added opposite relation field ${sanitizedFieldName} to ${targetModelName}`);
}

/**
 * Add model to Prisma schema
 */
export async function addModelToSchema(
  collectionName: string,
  fields: Field[]
): Promise<void> {
  const currentSchema = await readPrismaSchema();
  const modelDef = generatePrismaModel(collectionName, fields);
  
  // Check if model already exists
  const modelName = toPascalCase(collectionName);
  if (currentSchema.includes(`model ${modelName} {`)) {
    throw new Error(`Model ${modelName} already exists in schema`);
  }
  
  // Append model to schema
  const updatedSchema = currentSchema + '\n' + modelDef;
  await writePrismaSchema(updatedSchema);
  
  // Add opposite relation fields to target models
  for (const field of fields) {
    if (field.type === 'relation' && field.relation) {
      try {
        await addOppositeRelationField(
          collectionName,
          field.relation.targetCollection,
          field.relation.type,
          field.relation.targetField
        );
      } catch (error) {
        console.error(`Error adding opposite relation field:`, error);
        // Continue even if opposite relation fails
      }
    }
  }
}

/**
 * Remove model from Prisma schema
 */
export async function removeModelFromSchema(collectionName: string): Promise<void> {
  const currentSchema = await readPrismaSchema();
  const modelName = toPascalCase(collectionName);
  
  // Find and remove the model
  const modelRegex = new RegExp(`model ${modelName} \\{[^}]+\\}\\n?`, 'g');
  const updatedSchema = currentSchema.replace(modelRegex, '');
  
  await writePrismaSchema(updatedSchema);
}

/**
 * Run Prisma migration
 */
export async function runPrismaMigration(migrationName: string): Promise<void> {
  try {
    console.log('Starting Prisma migration...');
    
    // Generate Prisma Client first
    console.log('Generating Prisma Client...');
    await execAsync('npx prisma generate', { 
      windowsHide: true,
      timeout: 60000 
    });
    
    // Create and apply migration
    console.log('Creating migration...');
    await execAsync(`npx prisma migrate dev --name ${migrationName} --skip-generate`, {
      windowsHide: true,
      timeout: 120000
    });
    
    console.log(`Migration ${migrationName} completed successfully`);
  } catch (error: any) {
    console.error('Migration error:', error);
    
    // If it's a Windows permission error, try alternative approach
    if (error.message && error.message.includes('EPERM')) {
      console.log('Retrying with db push...');
      try {
        await execAsync('npx prisma db push --skip-generate', {
          windowsHide: true,
          timeout: 120000
        });
        console.log('Database pushed successfully');
        return;
      } catch (pushError: any) {
        throw new Error(`Migration failed: ${pushError.message}`);
      }
    }
    
    throw new Error(`Migration failed: ${error.message}`);
  }
}

/**
 * Format Prisma schema
 */
export async function formatPrismaSchema(): Promise<void> {
  try {
    await execAsync('npx prisma format', { 
      windowsHide: true,
      timeout: 30000 
    });
  } catch (error) {
    console.error('Format error:', error);
    // Don't throw - formatting is not critical
  }
}

/**
 * Complete workflow: Add model and migrate
 */
export async function createDynamicTable(
  collectionName: string,
  fields: Field[]
): Promise<void> {
  console.log(`Creating dynamic table for: ${collectionName}`);
  
  try {
    // 1. Add model to schema
    console.log('Adding model to schema...');
    await addModelToSchema(collectionName, fields);
    
    // 2. Format schema
    console.log('Formatting schema...');
    await formatPrismaSchema();
    
    // 3. Run migration
    const migrationName = `add_${collectionName.replace(/-/g, '_')}_table`;
    console.log(`Running migration: ${migrationName}`);
    await runPrismaMigration(migrationName);
    
    console.log(`✓ Table ${collectionName} created successfully`);
  } catch (error: any) {
    console.error(`✗ Failed to create table ${collectionName}:`, error);
    
    // Rollback: remove model from schema if migration fails
    try {
      console.log('Rolling back schema changes...');
      await removeModelFromSchema(collectionName);
    } catch (rollbackError) {
      console.error('Rollback error:', rollbackError);
    }
    
    throw new Error(`Failed to create table: ${error.message}`);
  }
}

/**
 * Delete dynamic table
 */
export async function deleteDynamicTable(collectionName: string): Promise<void> {
  try {
    // 1. Remove model from schema
    await removeModelFromSchema(collectionName);
    
    // 2. Format schema
    await formatPrismaSchema();
    
    // 3. Run migration
    const migrationName = `remove_${collectionName.replace(/-/g, '_')}_table`;
    await runPrismaMigration(migrationName);
    
    console.log(`Table ${collectionName} deleted successfully`);
  } catch (error) {
    throw error;
  }
}
