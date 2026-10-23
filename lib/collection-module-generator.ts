/**
 * Collection Module Generator
 *
 * Generates a complete collection module with inline business logic:
 *
 *   models/<collectionName>.model.ts
 *   app/(backend)/api/collections/<collectionName>/handler.ts   (admin, JWT auth)
 *   app/(backend)/api/collections/<collectionName>/route.ts
 *   app/(backend)/api/collections/<collectionName>/[id]/handler.ts
 *   app/(backend)/api/collections/<collectionName>/[id]/route.ts
 *   app/(backend)/v1/api/collections/<collectionName>/handler.ts  (public, bearer token)
 *   app/(backend)/v1/api/collections/<collectionName>/route.ts
 *   app/(backend)/v1/api/collections/<collectionName>/[id]/handler.ts
 *   app/(backend)/v1/api/collections/<collectionName>/[id]/route.ts
 * No separate controller or service folders - all business logic is inline
 * in the route files.
 *
 * Runtime architecture:
 *
 *   Route (inline logic) -> model -> lib/dynamic-prisma -> PostgreSQL
 */

import type { Field } from './types';
import { sanitizeTableName } from './dynamic-table-service';


export interface GenerateCollectionModuleOptions {
  collectionName: string;
  displayName?: string;
  fields?: Field[];
  includeAdminPages?: boolean;
}

export interface CollectionModulePaths {
  model: string;
  apiDir: string;
  apiIndex: string;
  apiIndexRoute: string;
  apiId: string;
  apiIdRoute: string;
  v1ApiDir: string;
  v1ApiIndex: string;
  v1ApiIndexRoute: string;
  v1ApiId: string;
  v1ApiIdRoute: string;
}

export interface GeneratedCollectionModule {
  collectionName: string;
  files: string[];
}

const SAFE_COLLECTION_NAME = /^[a-z0-9][a-z0-9_-]*$/;

export function normalizeCollectionName(collectionName: string): string {
  return String(collectionName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function toIdentifier(collectionName: string): string {
  const identifier = normalizeCollectionName(collectionName)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return identifier || 'Collection';
}

export function assertSafeCollectionName(collectionName: string): void {
  if (!SAFE_COLLECTION_NAME.test(collectionName)) {
    throw new Error(
      `Invalid collection name for file generation: "${collectionName}"`
    );
  }
}

export function getCollectionModulePaths(
  collectionName: string
): CollectionModulePaths {
  const nodePath = (globalThis as any).__nodePath || ((globalThis as any).__nodePath = eval('require')('path'));
  const name = normalizeCollectionName(collectionName);
  const root = process.cwd();
  const apiDir = nodePath.join(root, 'app', '(backend)', 'api', 'collections', name);
  const v1ApiDir = nodePath.join(root, 'app', '(backend)', 'v1', 'api', 'collections', name);

  return {
    model: nodePath.join(root, 'models', `${name}.model.ts`),
    apiDir,
    apiIndex: nodePath.join(apiDir, 'handler.ts'),
    apiIndexRoute: nodePath.join(apiDir, 'route.ts'),
    apiId: nodePath.join(apiDir, '[id]', 'handler.ts'),
    apiIdRoute: nodePath.join(apiDir, '[id]', 'route.ts'),
    v1ApiDir,
    v1ApiIndex: nodePath.join(v1ApiDir, 'handler.ts'),
    v1ApiIndexRoute: nodePath.join(v1ApiDir, 'route.ts'),
    v1ApiId: nodePath.join(v1ApiDir, '[id]', 'handler.ts'),
    v1ApiIdRoute: nodePath.join(v1ApiDir, '[id]', 'route.ts'),
  };
}

function writeGeneratedFile(filePath: string, content: string): string {
  const fs = (globalThis as any).__nodeFs || ((globalThis as any).__nodeFs = eval('require')('fs'));
  const path = (globalThis as any).__nodePath || ((globalThis as any).__nodePath = eval('require')('path'));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Generated: ${path.relative(process.cwd(), filePath)}`);
  return filePath;
}

function removeIfExists(targetPath: string): boolean {
  const fs = (globalThis as any).__nodeFs || ((globalThis as any).__nodeFs = eval('require')('fs'));
  const path = (globalThis as any).__nodePath || ((globalThis as any).__nodePath = eval('require')('path'));
  if (!fs.existsSync(targetPath)) return false;
  fs.rmSync(targetPath, { recursive: true, force: true });
  console.log(`Removed: ${path.relative(process.cwd(), targetPath)}`);
  return true;
}

function tsTypeForField(field: Field): string {
  switch (field.type) {
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'date': return 'string | Date';
    case 'json':
    case 'media':
    case 'component':
    case 'dynamiczone':
    case 'relation': return 'any';
    default: return 'string';
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
/*                       Inline business logic block                          */
/* -------------------------------------------------------------------------- */

export function generateBusinessLogicBlock(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { identifier } = params;
  const alias = `${identifier}Model`;

  return `
function httpError(statusCode: number, message: string): Error {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

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
        'This ' + field.displayName + ' already exists. The field "' + field.displayName + '" must be unique.'
      );
    }
  }
}

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
        processed[field.name] = await processComponentValue(value, field.componentRef!);
      }
    } catch (error: any) {
      console.error('[${identifier}] Error processing field ' + field.name + ':', error);
    }
  }

  return processed;
}

async function processComponentValue(value: any, componentName: string): Promise<string> {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && value.id) return value.id;

  if (typeof value === 'object' && value !== null) {
    const entry = await createComponentEntry(componentName, value);
    return entry.id;
  }

  throw httpError(400, 'Invalid component value: ' + JSON.stringify(value));
}

async function listEntries(options: { populate?: boolean } = {}): Promise<Record<string, any>[]> {
  const fields = await getFields();
  const entries = await ${alias}.findMany();
  const resolved = await resolveMultipleRelations(entries, ${alias}.COLLECTION_NAME, fields);

  if (options.populate) {
    return populateMultipleEntries(resolved, fields);
  }
  return resolved;
}

async function getEntry(id: string, options: { populate?: boolean; locale?: string } = {}): Promise<Record<string, any>> {
  const fields = await getFields();
  
  // First, get the entry by id to determine the rootId
  const entry = await ${alias}.findById(id);
  if (!entry) {
    throw httpError(404, 'Entry not found');
  }

  // Determine the target locale (default to 'en' if not specified)
  const targetLocale = options.locale || DEFAULT_CONTENT_LOCALE;
  
  // Get the rootId (for English entries, rootId === id)
  const rootId = entry.rootId || entry.id;
  
  let finalEntry = entry;
  
  // If the requested locale is different from the entry's locale, find the translation
  if (targetLocale !== entry.locale) {
    console.log(\`[${identifier} GET] Entry locale (\${entry.locale}) doesn't match requested locale (\${targetLocale})\`);
    console.log(\`[${identifier} GET] Looking for translation with rootId=\${rootId} and locale=\${targetLocale}\`);
    
    // Query for the entry with matching rootId and locale
    const translatedEntries = await ${alias}.findMany({
      where: {
        rootId: rootId,
        locale: targetLocale
      }
    });
    
    if (translatedEntries && translatedEntries.length > 0) {
      finalEntry = translatedEntries[0];
      console.log(\`[${identifier} GET] Found translation:\`, finalEntry.id);
    } else {
      console.log(\`[${identifier} GET] No translation found for locale \${targetLocale}\`);
      throw httpError(404, \`Entry not found for locale: \${targetLocale}\`);
    }
  }

  const resolved = await populateRelations({ ...finalEntry }, ${alias}.COLLECTION_NAME, fields);

  if (options.populate) {
    return populateComponents(resolved, fields);
  }
  return resolved;
}

async function createEntry(entryData: Record<string, any>): Promise<Record<string, any>> {
  if (!entryData || Object.keys(entryData).length === 0) {
    throw httpError(400, 'Missing entry data');
  }

  const fields = await getFields();
  await assertUnique(fields, entryData);

  const processed = await processComponentFields(entryData, fields);
  const filtered = filterVirtualRelationFields(fields, processed);

  return ${alias}.create(filtered);
}

async function updateEntry(id: string, entryData: Record<string, any>): Promise<Record<string, any>> {
  if (!entryData || Object.keys(entryData).length === 0) {
    throw httpError(400, 'Missing entry data');
  }

  const fields = await getFields();
  await assertUnique(fields, entryData, id);

  const processed = await processComponentFields(entryData, fields);
  const { manyToManyData, cleanedData } = extractManyToManyData(processed, fields);
  const filtered = filterVirtualRelationFields(fields, cleanedData);

  const dataToUpdate: Record<string, any> = {};
  Object.keys(filtered).forEach((key) => {
    if (filtered[key] !== undefined) {
      dataToUpdate[key] = filtered[key];
    }
  });

  const entry = await ${alias}.update(id, dataToUpdate);

  if (Object.keys(manyToManyData).length > 0) {
    await updateManyToManyRelations(${alias}.COLLECTION_NAME, id, manyToManyData, fields);
  }

  return entry;
}

async function deleteEntry(id: string): Promise<void> {
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
/*                          Shared route file header                          */
/* -------------------------------------------------------------------------- */

function getRouteImports(identifier: string, collectionName: string): string {
  return `import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse, Field } from '@/lib/types';
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';
import { withApiToken } from '@/lib/api-tokens/middleware';
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
import { DEFAULT_CONTENT_LOCALE } from '@/lib/dynamic-table-service';
import * as ${identifier}Model from '@/models/${collectionName}.model';`;
}

/**
 * App Router `route.ts` wrapper that adapts the Pages-style `handler.ts`.
 */
export function generateRouteWrapperTemplate(): string {
  return `export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adaptHandler } from '@/lib/app-router/route-adapter';
import handler from './handler';

const route = adaptHandler(handler as any);

export const GET = route;
export const POST = route;
export const PUT = route;
export const PATCH = route;
export const DELETE = route;
export const OPTIONS = route;
export const HEAD = route;
`;
}

/* -------------------------------------------------------------------------- */
/*                          Admin API route templates                         */
/* -------------------------------------------------------------------------- */

export function generateAdminRouteIndexTemplate(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { collectionName, identifier } = params;
  const businessLogic = generateBusinessLogicBlock(params);

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.
 *
 * Admin API route: /api/collections/${collectionName}
 * Uses JWT authentication (admin panel login).
 * All business logic is inline in this file.
 *
 * Generated by lib/collection-module-generator.ts.
 */
${getRouteImports(identifier, collectionName)}

${businessLogic}

function sendError(res: NextApiResponse<ApiResponse>, error: any, context: string): void {
  console.error('[${identifier} Route]', context, error);
  const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
  res.status(statusCode).json({ error: error?.message || 'Internal server error' });
}

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>): Promise<void> {
  try {
    if (req.method === 'GET') {
      const entries = await listEntries({ populate: req.query.populate === 'true' });
      res.status(200).json({ data: entries });
      return;
    }
    if (req.method === 'POST') {
      const entryData = (req.body && req.body.data) || {};
      const entry = await createEntry(entryData);
      res.status(201).json({ data: entry });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    sendError(res, error, 'Request failed');
  }
}

export default authMiddleware(handler);
`;
}

export function generateAdminRouteIdTemplate(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { collectionName, identifier } = params;
  const businessLogic = generateBusinessLogicBlock(params);

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.
 *
 * Admin API route: /api/collections/${collectionName}/[id]
 * Uses JWT authentication (admin panel login).
 * All business logic is inline in this file.
 *
 * Generated by lib/collection-module-generator.ts.
 */
${getRouteImports(identifier, collectionName)}

${businessLogic}

function sendError(res: NextApiResponse<ApiResponse>, error: any, context: string): void {
  console.error('[${identifier} Route]', context, error);
  const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
  res.status(statusCode).json({ error: error?.message || 'Internal server error' });
}

function readEntryId(req: NextApiRequest): string | null {
  const { id } = req.query;
  return typeof id === 'string' ? id : null;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>): Promise<void> {
  try {
    const id = readEntryId(req);
    if (!id) {
      res.status(400).json({ error: 'Invalid entry id' });
      return;
    }
    if (req.method === 'GET') {
      const locale = typeof req.query.locale === 'string' ? req.query.locale : undefined;
      const entry = await getEntry(id, { 
        populate: req.query.populate === 'true',
        locale: locale 
      });
      res.status(200).json({ data: entry });
      return;
    }
    if (req.method === 'PUT') {
      const entryData = (req.body && req.body.data) || {};
      const entry = await updateEntry(id, entryData);
      res.status(200).json({ data: entry });
      return;
    }
    if (req.method === 'DELETE') {
      await deleteEntry(id);
      res.status(200).json({ message: 'Entry deleted' });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    sendError(res, error, 'Request failed');
  }
}

export default authMiddleware(handler);
`;
}

/* -------------------------------------------------------------------------- */
/*                       Public v1 API route templates                        */
/* -------------------------------------------------------------------------- */

export function generateV1RouteIndexTemplate(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { collectionName, identifier } = params;
  const businessLogic = generateBusinessLogicBlock(params);

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.
 *
 * Public API route: /v1/api/collections/${collectionName}
 * Uses bearer token authentication (API tokens from admin panel).
 * All business logic is inline in this file.
 *
 * Generated by lib/collection-module-generator.ts.
 */
${getRouteImports(identifier, collectionName)}

${businessLogic}

function sendError(res: NextApiResponse<ApiResponse>, error: any, context: string): void {
  console.error('[${identifier} Route]', context, error);
  const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
  res.status(statusCode).json({ error: error?.message || 'Internal server error' });
}

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>): Promise<void> {
  try {
    if (req.method === 'GET') {
      const entries = await listEntries({ populate: req.query.populate === 'true' });
      res.status(200).json({ data: entries });
      return;
    }
    if (req.method === 'POST') {
      const entryData = (req.body && req.body.data) || {};
      const entry = await createEntry(entryData);
      res.status(201).json({ data: entry });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    sendError(res, error, 'Request failed');
  }
}

export default withApiToken(handler);
`;
}

export function generateV1RouteIdTemplate(params: {
  collectionName: string;
  identifier: string;
}): string {
  const { collectionName, identifier } = params;
  const businessLogic = generateBusinessLogicBlock(params);

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY.
 *
 * Public API route: /v1/api/collections/${collectionName}/[id]
 * Uses bearer token authentication (API tokens from admin panel).
 * All business logic is inline in this file.
 *
 * Generated by lib/collection-module-generator.ts.
 */
${getRouteImports(identifier, collectionName)}

${businessLogic}

function sendError(res: NextApiResponse<ApiResponse>, error: any, context: string): void {
  console.error('[${identifier} Route]', context, error);
  const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
  res.status(statusCode).json({ error: error?.message || 'Internal server error' });
}

function readEntryId(req: NextApiRequest): string | null {
  const { id } = req.query;
  return typeof id === 'string' ? id : null;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>): Promise<void> {
  try {
    const id = readEntryId(req);
    if (!id) {
      res.status(400).json({ error: 'Invalid entry id' });
      return;
    }
    if (req.method === 'GET') {
      const locale = typeof req.query.locale === 'string' ? req.query.locale : undefined;
      const entry = await getEntry(id, { 
        populate: req.query.populate === 'true',
        locale: locale 
      });
      res.status(200).json({ data: entry });
      return;
    }
    if (req.method === 'PUT') {
      const entryData = (req.body && req.body.data) || {};
      const entry = await updateEntry(id, entryData);
      res.status(200).json({ data: entry });
      return;
    }
    if (req.method === 'DELETE') {
      await deleteEntry(id);
      res.status(200).json({ message: 'Entry deleted' });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    sendError(res, error, 'Request failed');
  }
}

export default withApiToken(handler);
`;
}

/* -------------------------------------------------------------------------- */
/*                          Public generator API                              */
/* -------------------------------------------------------------------------- */

export async function generateCollectionModule(
  options: GenerateCollectionModuleOptions
): Promise<GeneratedCollectionModule> {
  const collectionName = normalizeCollectionName(options.collectionName);
  assertSafeCollectionName(collectionName);

  const fields = options.fields || [];
  const identifier = toIdentifier(collectionName);
  const tableName = sanitizeTableName(collectionName);
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
      paths.apiIndex,
      generateAdminRouteIndexTemplate({ collectionName, identifier })
    )
  );
  files.push(
    writeGeneratedFile(paths.apiIndexRoute, generateRouteWrapperTemplate())
  );
  files.push(
    writeGeneratedFile(
      paths.apiId,
      generateAdminRouteIdTemplate({ collectionName, identifier })
    )
  );
  files.push(
    writeGeneratedFile(paths.apiIdRoute, generateRouteWrapperTemplate())
  );
  files.push(
    writeGeneratedFile(
      paths.v1ApiIndex,
      generateV1RouteIndexTemplate({ collectionName, identifier })
    )
  );
  files.push(
    writeGeneratedFile(paths.v1ApiIndexRoute, generateRouteWrapperTemplate())
  );
  files.push(
    writeGeneratedFile(
      paths.v1ApiId,
      generateV1RouteIdTemplate({ collectionName, identifier })
    )
  );
  files.push(
    writeGeneratedFile(paths.v1ApiIdRoute, generateRouteWrapperTemplate())
  );

  console.log(
    `Collection module generated for "${collectionName}" (${files.length} files)`
  );

  return { collectionName, files };
}

export function deleteCollectionModule(collectionName: string): void {
  const collectionNameNormalized = normalizeCollectionName(collectionName);
  assertSafeCollectionName(collectionNameNormalized);

  const paths = getCollectionModulePaths(collectionNameNormalized);

  removeIfExists(paths.model);
  removeIfExists(paths.apiIndex);
  removeIfExists(paths.apiId);
  removeIfExists(paths.apiDir);
  removeIfExists(paths.v1ApiIndex);
  removeIfExists(paths.v1ApiId);
  removeIfExists(paths.v1ApiDir);
}

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
  });

  if (oldName && oldName !== newName) {
    deleteCollectionModule(oldName);
  }

  return generated;
}
