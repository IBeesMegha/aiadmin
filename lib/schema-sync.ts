/**
 * Schema Synchronization Engine
 * Regenerates complete Prisma schema from metadata
 */

import { Field } from './types';
import { 
  getAllCollectionTypes,
  getCollectionRelations,
  isRelationOwner,
} from './relation-engine';
import fs from 'fs/promises';
import path from 'path';

/**
 * Convert to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Convert to camelCase
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Sanitize field name to be Prisma-compatible
 */
function sanitizeFieldName(fieldName: string): string {
  let sanitized = fieldName
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  
  const parts = sanitized.split('_').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return 'field';
  }
  
  return parts[0].toLowerCase() + parts.slice(1).map(part => 
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  ).join('');
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
  };
  
  if (fieldType === 'media') {
    return multiple ? 'Json' : 'String';
  }
  
  return typeMap[fieldType] || 'String';
}

/**
 * Generate Prisma model from collection metadata
 */
export function generatePrismaModelFromMetadata(
  collectionName: string,
  fields: Field[]
): string {
  const modelName = toPascalCase(collectionName);
  const tableName = collectionName.toLowerCase().replace(/-/g, '_');
  
  let modelDef = `model ${modelName} {\n`;
  modelDef += `  id        String   @id @default(cuid())\n`;
  
  // Add regular fields and relation fields
  fields.forEach(field => {
    if (field.type === 'relation' && field.relation) {
      // Handle relation fields
      const targetModel = toPascalCase(field.relation.targetCollection);
      const sanitizedFieldName = sanitizeFieldName(field.name);
      const relationName = field.relation.relationName || `${modelName}To${targetModel}`;
      
      // Check if this side owns the foreign key
      const ownsFK = isRelationOwner(field);
      
      switch (field.relation.type) {
        case 'oneToOne':
          if (ownsFK) {
            // Owner side: has foreign key
            modelDef += `  ${sanitizedFieldName}Id String?   @unique\n`;
            modelDef += `  ${sanitizedFieldName}   ${targetModel}? @relation("${relationName}", fields: [${sanitizedFieldName}Id], references: [id])\n`;
          } else {
            // Non-owner side: just the relation
            modelDef += `  ${sanitizedFieldName}   ${targetModel}? @relation("${relationName}")\n`;
          }
          break;
          
        case 'manyToOne':
          // Many side always owns the foreign key
          modelDef += `  ${sanitizedFieldName}Id String?\n`;
          modelDef += `  ${sanitizedFieldName}   ${targetModel}? @relation("${relationName}", fields: [${sanitizedFieldName}Id], references: [id])\n`;
          break;
          
        case 'oneToMany':
          // One side: array relation, no foreign key
          modelDef += `  ${sanitizedFieldName}   ${targetModel}[] @relation("${relationName}")\n`;
          break;
          
        case 'manyToMany':
          // Many-to-many: implicit join table
          modelDef += `  ${sanitizedFieldName}   ${targetModel}[]\n`;
          break;
      }
    } else {
      // Handle regular fields
      const prismaType = fieldTypeToPrismaType(field.type, field.multiple);
      const optional = field.required ? '' : '?';
      const unique = field.unique ? ' @unique' : '';
      const sanitizedFieldName = sanitizeFieldName(field.name);
      
      modelDef += `  ${sanitizedFieldName}  ${prismaType}${optional}${unique}\n`;
    }
  });
  
  // Add metadata fields
  modelDef += `  createdAt DateTime @default(now())\n`;
  modelDef += `  updatedAt DateTime @updatedAt\n`;
  
  // Add table mapping
  modelDef += `\n  @@map("${tableName}")\n`;
  modelDef += `}\n`;
  
  return modelDef;
}

/**
 * Generate complete Prisma schema from all collection metadata
 */
export async function generateCompleteSchema(): Promise<string> {
  // Get all collections
  const allCollections = await getAllCollectionTypes();
  
  // Start with base schema
  let schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Content Type Definitions
model CollectionType {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  description String?
  fields      Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SingleType {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  description String?
  fields      Json
  data        Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Component {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  category    String
  fields      Json
  entries     ComponentEntry[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ComponentEntry {
  id          String    @id @default(cuid())
  componentId String
  component   Component @relation(fields: [componentId], references: [id], onDelete: Cascade)
  data        Json
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([componentId])
  @@map("component_entries")
}

// Media Library
model Media {
  id              String   @id @default(cuid())
  name            String
  alternativeText String?
  caption         String?
  url             String
  mime            String
  size            Int
  width           Int?
  height          Int?
  ext             String
  folder          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("media")
}

// Dynamic Collection Types
`;

  // Generate models for all collections
  for (const [collectionName, fields] of Array.from(allCollections.entries())) {
    const modelDef = generatePrismaModelFromMetadata(collectionName, fields);
    schema += '\n' + modelDef;
  }
  
  return schema;
}

/**
 * Write schema to file
 */
export async function writeSchemaToFile(schema: string): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  await fs.writeFile(schemaPath, schema, 'utf-8');
  console.log('✓ Prisma schema written to file');
}

/**
 * Regenerate complete Prisma schema from metadata
 * This is the main function to call when updating collections
 */
export async function regenerateSchema(): Promise<void> {
  console.log('Regenerating Prisma schema from metadata...');
  
  const schema = await generateCompleteSchema();
  await writeSchemaToFile(schema);
  
  console.log('✓ Schema regenerated successfully');
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
