/**
 * Collection Module Generator
 *
 * One generic generator that accepts a collection name (from the Content Type
 * Builder request) plus its fields and creates the complete collection module:
 *
 *   models/<collectionName>.model.ts
 *   services/<collectionName>.service.ts
 *   controllers/<collectionName>.controller.ts
 *   pages/api/collections/<collectionName>/index.ts
 *   pages/api/collections/<collectionName>/[id].ts
 *   pages/admin/collections/<collectionName>/{index,new,[id]}.tsx
 *
 * Nothing is hardcoded - every collection (news, products, blogs, events or any
 * future collection) gets its own module generated from the same templates.
 *
 * Runtime architecture of a generated module:
 *
 *   API Route -> controller -> service -> model -> lib/dynamic-prisma -> PostgreSQL
 *
 * The generated model always points at the real dynamic table created by
 * lib/dynamic-table-service.ts, and the generic /api/collections/[name] routes
 * remain untouched as a fallback for collections without generated modules.
 */

import fs from 'fs';
import path from 'path';
import { Field } from './types';
import { sanitizeTableName } from './dynamic-table-service';
import {
  generateCollectionFolder,
  deleteCollectionFolder,
} from './collection-folder-generator';

export interface GenerateCollectionModuleOptions {
  /** Collection name as stored in the CollectionType metadata (required). */
  collectionName: string;
  /** Human readable name used for admin page titles. */
  displayName?: string;
  /** Collection fields (used for the generated model typing). */
  fields?: Field[];
  /** Generate the admin pages too (default: true). */
  includeAdminPages?: boolean;
}

export interface CollectionModulePaths {
  model: string;
  service: string;
  controller: string;
  apiIndex: string;
  apiId: string;
  apiDir: string;
  adminDir: string;
}

export interface GeneratedCollectionModule {
  collectionName: string;
  files: string[];
}

const SAFE_COLLECTION_NAME = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * Normalize a collection name the same way the Content Type Builder does.
 */
export function normalizeCollectionName(collectionName: string): string {
  return String(collectionName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/**
 * Build a PascalCase identifier from a collection name.
 * news -> News, blog-posts -> BlogPosts, "Event Items" -> EventItems
 */
export function toIdentifier(collectionName: string): string {
  const identifier = normalizeCollectionName(collectionName)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return identifier || 'Collection';
}

/**
 * Guard against path traversal / invalid file names. Only the collection name
 * coming from the request is used to build paths, so it must be safe.
 */
export function assertSafeCollectionName(collectionName: string): void {
  if (!SAFE_COLLECTION_NAME.test(collectionName)) {
    throw new Error(
      `Invalid collection name for file generation: "${collectionName}"`
    );
  }
}

/**
 * All files/folders that belong to a generated collection module.
 */
export function getCollectionModulePaths(
  collectionName: string
): CollectionModulePaths {
  const name = normalizeCollectionName(collectionName);
  const root = process.cwd();
  const apiDir = path.join(root, 'pages', 'api', 'collections', name);

  return {
    model: path.join(root, 'models', `${name}.model.ts`),
    service: path.join(root, 'services', `${name}.service.ts`),
    controller: path.join(root, 'controllers', `${name}.controller.ts`),
    apiIndex: path.join(apiDir, 'index.ts'),
    apiId: path.join(apiDir, '[id].ts'),
    apiDir,
    adminDir: path.join(root, 'pages', 'admin', 'collections', name),
  };
}

/* -------------------------------------------------------------------------- */
/*                              File management                               */
/* -------------------------------------------------------------------------- */

function writeGeneratedFile(filePath: string, content: string): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Generated: ${path.relative(process.cwd(), filePath)}`);
  return filePath;
}

function removeIfExists(targetPath: string): boolean {
  if (!fs.existsSync(targetPath)) return false;
  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log(`✓ Removed: ${path.relative(process.cwd(), targetPath)}`);
  return true;
}

/* -------------------------------------------------------------------------- */
/*                             Template helpers                               */
/* -------------------------------------------------------------------------- */

function tsTypeForField(field: Field): string {
  switch (field.type) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'string | Date';
    case 'json':
    case 'media':
    case 'component':
    case 'dynamiczone':
    case 'relation':
      return 'any';
    default:
      return 'string';
  }
}

function propertyKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
    ? name
    : `'${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function escapeComment(value: string): string {
  return String(value).replace(/\*\//g, '*\\/');
}

function generateEntryInterface(identifier: string, fields: Field[]): string {
  const lines: string[] = [
    '  id: string;',
    '  createdAt: string | Date;',
    '  updatedAt: string | Date;',
  ];
  const seen = new Set(['id', 'createdAt', 'updatedAt']);

  for (const field of fields) {
    if (!field || typeof field.name !== 'string' || !field.name) continue;
    if (seen.has(field.name)) continue;
    seen.add(field.name);
    lines.push(`  ${propertyKey(field.name)}?: ${tsTypeForField(field)};`);
  }

  return [
    `export interface ${identifier}Entry {`,
    ...lines,
    '}',
  ].join('\n');
}

/* -------------------------------------------------------------------------- */
/*                              Model template                                */
/* -------------------------------------------------------------------------- */

export function generateModelTemplate(params: {
  collectionName: string;
  identifier: string;
  tableName: string;
  fields: Field[];
}): string {
  const { collectionName, identifier, tableName, fields } = params;
  const header = [
    '/**',
    ' * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.',
    ` *`,
    ` * Model for the "${escapeComment(collectionName)}" collection.`,
    ` * Physical table: "${escapeComment(tableName)}"`,
    ` *`,
    ' * Generated by lib/collection-module-generator.ts.',
    ' * Editing the collection in the Content Type Builder regenerates this file.',
    ' */',
    '',
  ].join('\n');

  return `${header}import {
  findManyDynamic,
  findUniqueDynamic,
  createDynamic,
  updateDynamic,
  deleteDynamic,
} from '@/lib/dynamic-prisma';
import { prisma } from '@/lib/prisma';
import type { Field } from '@/lib/types';

/** Collection name as stored in the CollectionType metadata. */
export const COLLECTION_NAME = '${collectionName}';

/** Physical PostgreSQL table backing this collection. */
export const TABLE_NAME = '${tableName}';

${generateEntryInterface(identifier, fields)}

/**
 * All entries of the collection (ordered by createdAt DESC).
 */
export async function findMany(options?: {
  where?: Record<string, any>;
}): Promise<any[]> {
  const rows = await findManyDynamic(TABLE_NAME, options);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Single entry by id (null when it does not exist).
 */
export async function findById(id: string): Promise<any | null> {
  const rows = (await findUniqueDynamic(TABLE_NAME, id)) as any[];
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/**
 * Insert an entry into the dynamic table.
 */
export async function create(data: Record<string, any>): Promise<any> {
  return createDynamic(TABLE_NAME, data);
}

/**
 * Update an entry of the dynamic table.
 */
export async function update(
  id: string,
  data: Record<string, any>
): Promise<any> {
  return updateDynamic(TABLE_NAME, id, data);
}

/**
 * Delete an entry of the dynamic table.
 */
export async function remove(id: string): Promise<any> {
  return deleteDynamic(TABLE_NAME, id);
}

/**
 * CollectionType metadata (fields, relations, ...) for this collection.
 */
export async function getCollectionType(): Promise<any> {
  return prisma.collectionType.findUnique({
    where: { name: COLLECTION_NAME },
  });
}

/**
 * Field definitions of this collection (includes relation fields).
 */
export async function getFields(): Promise<Field[]> {
  const collectionType = await getCollectionType();
  const fields = (collectionType && (collectionType.fields as any)) || null;
  return fields && Array.isArray(fields.fields)
    ? (fields.fields as Field[])
    : [];
}
`;
}

/* -------------------------------------------------------------------------- */
/*                              Service template                              */
/* -------------------------------------------------------------------------- */

export function generateServiceTemplate(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { collectionName, identifier } = params;
  const modelImport = `@/models/${collectionName}.model`;
  const alias = `${identifier}Model`;

  const header = [
    '/**',
    ' * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.',
    ` *`,
    ` * Service for the "${escapeComment(collectionName)}" collection.`,
    ' * All entry data access goes through the generated model only.',
    ' *',
    ' * Generated by lib/collection-module-generator.ts.',
    ' */',
    '',
  ].join('\n');

  return `${header}import * as ${alias} from '${modelImport}';
import type { Field } from '@/lib/types';
import { resolveMultipleRelations } from '@/lib/relation-resolver';
import { populateRelations } from '@/lib/relation-populate';
import {
  populateComponents,
  populateMultipleEntries,
  createComponentEntry,
} from '@/lib/component-populate';
import { filterVirtualRelationFields } from '@/lib/relation-engine';
import {
  extractManyToManyData,
  updateManyToManyRelations,
} from '@/lib/many-to-many-handler';

function httpError(statusCode: number, message: string): Error {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

/**
 * Current field definitions of the collection (fetched from metadata).
 */
async function getFields(): Promise<Field[]> {
  const collectionType = await ${alias}.getCollectionType();
  if (!collectionType) {
    throw httpError(404, 'Collection type not found');
  }
  const fields = (collectionType.fields as any) || null;
  return fields && Array.isArray(fields.fields)
    ? (fields.fields as Field[])
    : [];
}

/**
 * Unique field validation (same rules as the generic collections API).
 */
async function assertUnique(
  fields: Field[],
  data: Record<string, any>,
  excludeId?: string
): Promise<void> {
  for (const field of fields) {
    if (!field.unique) continue;
    const value = data[field.name];
    if (value === undefined || value === null || value === '') continue;

    const existing = await ${alias}.findMany({
      where: { [field.name]: value },
    });
    const duplicate = existing.find((row: any) => row.id !== excludeId);
    if (duplicate) {
      throw httpError(
        400,
        'This ' +
          field.displayName +
          ' already exists. The field "' +
          field.displayName +
          '" must be unique.'
      );
    }
  }
}

/**
 * Create component entries for inline component data.
 */
async function processComponentFields(
  data: Record<string, any>,
  fields: Field[]
): Promise<Record<string, any>> {
  const processed: Record<string, any> = { ...data };

  for (const field of fields) {
    if (field.type !== 'component') continue;

    const value = data[field.name];
    if (!value) continue;

    try {
      if (field.multiple) {
        if (Array.isArray(value)) {
          processed[field.name] = await Promise.all(
            value.map((item: any) => processComponentValue(item, field.componentRef!))
          );
        }
      } else {
        processed[field.name] = await processComponentValue(
          value,
          field.componentRef!
        );
      }
    } catch (error: any) {
      console.error(
        '[${identifier} Service] Error processing field ' + field.name + ':',
        error
      );
    }
  }

  return processed;
}

async function processComponentValue(
  value: any,
  componentName: string
): Promise<string> {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && value.id) return value.id;

  if (typeof value === 'object' && value !== null) {
    const entry = await createComponentEntry(componentName, value);
    return entry.id;
  }

  throw httpError(400, 'Invalid component value: ' + JSON.stringify(value));
}

/**
 * List entries (relations are always resolved).
 */
export async function listEntries(
  options: { populate?: boolean } = {}
): Promise<Record<string, any>[]> {
  const fields = await getFields();
  const entries = await ${alias}.findMany();
  const resolved = await resolveMultipleRelations(
    entries,
    ${alias}.COLLECTION_NAME,
    fields
  );

  if (options.populate) {
    return populateMultipleEntries(resolved, fields);
  }
  return resolved;
}

/**
 * Single entry with populated relations.
 */
export async function getEntry(
  id: string,
  options: { populate?: boolean } = {}
): Promise<Record<string, any>> {
  const fields = await getFields();
  const entry = await ${alias}.findById(id);
  if (!entry) {
    throw httpError(404, 'Entry not found');
  }

  const resolved = await populateRelations(
    { ...entry },
    ${alias}.COLLECTION_NAME,
    fields
  );

  if (options.populate) {
    return populateComponents(resolved, fields);
  }
  return resolved;
}

/**
 * Create a new entry.
 */
export async function createEntry(
  entryData: Record<string, any>
): Promise<Record<string, any>> {
  if (!entryData || Object.keys(entryData).length === 0) {
    throw httpError(400, 'Missing entry data');
  }

  const fields = await getFields();
  await assertUnique(fields, entryData);

  const processed = await processComponentFields(entryData, fields);
  const filtered = filterVirtualRelationFields(fields, processed);

  return ${alias}.create(filtered);
}

/**
 * Update an existing entry.
 */
export async function updateEntry(
  id: string,
  entryData: Record<string, any>
): Promise<Record<string, any>> {
  if (!entryData || Object.keys(entryData).length === 0) {
    throw httpError(400, 'Missing entry data');
  }

  const fields = await getFields();
  await assertUnique(fields, entryData, id);

  const processed = await processComponentFields(entryData, fields);
  const { manyToManyData, cleanedData } = extractManyToManyData(
    processed,
    fields
  );
  const filtered = filterVirtualRelationFields(fields, cleanedData);

  const dataToUpdate: Record<string, any> = {};
  Object.keys(filtered).forEach((key) => {
    if (filtered[key] !== undefined) {
      dataToUpdate[key] = filtered[key];
    }
  });

  const entry = await ${alias}.update(id, dataToUpdate);

  if (Object.keys(manyToManyData).length > 0) {
    await updateManyToManyRelations(
      ${alias}.COLLECTION_NAME,
      id,
      manyToManyData,
      fields
    );
  }

  return entry;
}

/**
 * Delete an existing entry.
 */
export async function deleteEntry(id: string): Promise<void> {
  await getFields();
  const entry = await ${alias}.findById(id);
  if (!entry) {
    throw httpError(404, 'Entry not found');
  }

  await ${alias}.remove(id);
}
`;
}

/* -------------------------------------------------------------------------- */
/*                             Controller template                            */
/* -------------------------------------------------------------------------- */

export function generateControllerTemplate(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { collectionName, identifier } = params;
  const serviceImport = `@/services/${collectionName}.service`;
  const alias = `${identifier}Service`;
  const logPrefix = `[${identifier} Controller]`;

  const header = [
    '/**',
    ' * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.',
    ` *`,
    ` * Controller for the "${escapeComment(collectionName)}" collection.`,
    ' * Maps HTTP requests onto the generated service only.',
    ' *',
    ' * Generated by lib/collection-module-generator.ts.',
    ' */',
    '',
  ].join('\n');

  return `${header}import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '@/lib/types';
import * as ${alias} from '${serviceImport}';

function sendError(
  res: NextApiResponse<ApiResponse>,
  error: any,
  context: string
): void {
  console.error('${logPrefix}', context, error);
  const statusCode =
    typeof error?.statusCode === 'number' ? error.statusCode : 500;
  res.status(statusCode).json({
    error: error?.message || 'Internal server error',
  });
}

function readEntryId(req: NextApiRequest): string | null {
  const { id } = req.query;
  return typeof id === 'string' ? id : null;
}

/**
 * GET /api/collections/${collectionName}
 */
export async function listEntries(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  try {
    const entries = await ${alias}.listEntries({
      populate: req.query.populate === 'true',
    });
    res.status(200).json({ data: entries });
  } catch (error: any) {
    sendError(res, error, 'Failed to list entries');
  }
}

/**
 * POST /api/collections/${collectionName}
 */
export async function createEntry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  try {
    const entryData = (req.body && req.body.data) || {};
    const entry = await ${alias}.createEntry(entryData);
    res.status(201).json({ data: entry });
  } catch (error: any) {
    sendError(res, error, 'Failed to create entry');
  }
}

/**
 * GET /api/collections/${collectionName}/[id]
 */
export async function getEntry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  try {
    const id = readEntryId(req);
    if (!id) {
      res.status(400).json({ error: 'Invalid entry id' });
      return;
    }
    const entry = await ${alias}.getEntry(id, {
      populate: req.query.populate === 'true',
    });
    res.status(200).json({ data: entry });
  } catch (error: any) {
    sendError(res, error, 'Failed to get entry');
  }
}

/**
 * PUT /api/collections/${collectionName}/[id]
 */
export async function updateEntry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  try {
    const id = readEntryId(req);
    if (!id) {
      res.status(400).json({ error: 'Invalid entry id' });
      return;
    }
    const entryData = (req.body && req.body.data) || {};
    const entry = await ${alias}.updateEntry(id, entryData);
    res.status(200).json({ data: entry });
  } catch (error: any) {
    sendError(res, error, 'Failed to update entry');
  }
}

/**
 * DELETE /api/collections/${collectionName}/[id]
 */
export async function deleteEntry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  try {
    const id = readEntryId(req);
    if (!id) {
      res.status(400).json({ error: 'Invalid entry id' });
      return;
    }
    await ${alias}.deleteEntry(id);
    res.status(200).json({ message: 'Entry deleted' });
  } catch (error: any) {
    sendError(res, error, 'Failed to delete entry');
  }
}
`;
}

/* -------------------------------------------------------------------------- */
/*                              API route templates                           */
/* -------------------------------------------------------------------------- */

export function generateApiIndexTemplate(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { collectionName, identifier } = params;
  const controllerImport = `@/controllers/${collectionName}.controller`;
  const alias = `${identifier}Controller`;

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.
 *
 * API route: /api/collections/${collectionName}
 * Delegates to the generated controller (fallback: /api/collections/[name]).
 *
 * Generated by lib/collection-module-generator.ts.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '@/lib/types';
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';
import * as ${alias} from '${controllerImport}';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method === 'GET') {
    return ${alias}.listEntries(req, res);
  }
  if (req.method === 'POST') {
    return ${alias}.createEntry(req, res);
  }
  res.status(405).json({ error: 'Method not allowed' });
}

export default authMiddleware(handler);
`;
}

export function generateApiIdTemplate(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { collectionName, identifier } = params;
  const controllerImport = `@/controllers/${collectionName}.controller`;
  const alias = `${identifier}Controller`;

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.
 *
 * API route: /api/collections/${collectionName}/[id]
 * Delegates to the generated controller (fallback: /api/collections/[name]/[id]).
 *
 * Generated by lib/collection-module-generator.ts.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '@/lib/types';
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';
import * as ${alias} from '${controllerImport}';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method === 'GET') {
    return ${alias}.getEntry(req, res);
  }
  if (req.method === 'PUT') {
    return ${alias}.updateEntry(req, res);
  }
  if (req.method === 'DELETE') {
    return ${alias}.deleteEntry(req, res);
  }
  res.status(405).json({ error: 'Method not allowed' });
}

export default authMiddleware(handler);
`;
}

/* -------------------------------------------------------------------------- */
/*                          Public generator API                              */
/* -------------------------------------------------------------------------- */

/**
 * Generate the complete module (backend MVC + API routes + admin pages) for a
 * single collection. The collection name always comes from the request.
 */
export async function generateCollectionModule(
  options: GenerateCollectionModuleOptions
): Promise<GeneratedCollectionModule> {
  const collectionName = normalizeCollectionName(options.collectionName);
  assertSafeCollectionName(collectionName);

  const displayName = options.displayName || collectionName;
  const fields = options.fields || [];
  const identifier = toIdentifier(collectionName);
  const tableName = sanitizeTableName(collectionName);
  const includeAdminPages = options.includeAdminPages !== false;
  const paths = getCollectionModulePaths(collectionName);

  const files: string[] = [];

  files.push(
    writeGeneratedFile(
      paths.model,
      generateModelTemplate({ collectionName, identifier, tableName, fields })
    )
  );
  files.push(
    writeGeneratedFile(
      paths.service,
      generateServiceTemplate({ collectionName, identifier })
    )
  );
  files.push(
    writeGeneratedFile(
      paths.controller,
      generateControllerTemplate({ collectionName, identifier })
    )
  );
  files.push(
    writeGeneratedFile(
      paths.apiIndex,
      generateApiIndexTemplate({ collectionName, identifier })
    )
  );
  files.push(
    writeGeneratedFile(
      paths.apiId,
      generateApiIdTemplate({ collectionName, identifier })
    )
  );

  if (includeAdminPages) {
    await generateCollectionFolder(collectionName, displayName);
    files.push(
      paths.adminDir + path.sep + 'index.tsx',
      paths.adminDir + path.sep + 'new.tsx',
      paths.adminDir + path.sep + '[id].tsx'
    );
  }

  console.log(
    `✓✓ Collection module generated for "${collectionName}" (${files.length} files)`
  );

  return { collectionName, files };
}

/**
 * Remove every generated file that belongs to a collection. Never touches
 * unrelated files (the generic [name] fallback routes are left alone).
 */
export function deleteCollectionModule(collectionName: string): void {
  const collectionNameNormalized = normalizeCollectionName(collectionName);
  assertSafeCollectionName(collectionNameNormalized);

  const paths = getCollectionModulePaths(collectionNameNormalized);

  removeIfExists(paths.model);
  removeIfExists(paths.service);
  removeIfExists(paths.controller);
  removeIfExists(paths.apiIndex);
  removeIfExists(paths.apiId);
  removeIfExists(paths.apiDir);
  removeIfExists(paths.adminDir);
}

/**
 * Rename a generated module: generate everything under the new name (so all
 * internal collection references are updated) and delete the old files.
 */
export async function renameCollectionModule(params: {
  oldName: string;
  newName: string;
  displayName?: string;
  fields?: Field[];
}): Promise<GeneratedCollectionModule> {
  const oldName = normalizeCollectionName(params.oldName);
  const newName = normalizeCollectionName(params.newName);

  const generated = await generateCollectionModule({
    collectionName: newName,
    displayName: params.displayName,
    fields: params.fields,
    includeAdminPages: true,
  });

  if (oldName && oldName !== newName) {
    deleteCollectionModule(oldName);
  }

  return generated;
}
