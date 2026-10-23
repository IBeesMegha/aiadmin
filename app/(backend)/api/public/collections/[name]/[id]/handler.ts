export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { findManyDynamic, updateDynamic, deleteDynamic } from '@/lib/dynamic-prisma';
import { ApiResponse, Field } from '@/lib/types';
import { filterVirtualRelationFields } from '@/lib/relation-engine';
import { populateComponents, createComponentEntry } from '@/lib/component-populate';
import { populateRelations } from '@/lib/relation-populate';
import { resolveRequestLocale } from '@/lib/content-i18n';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(
  req: ApiTokenRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { name, id, populate } = req.query;

  if (typeof name !== 'string' || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const collectionType = await prisma.collectionType.findUnique({
      where: { name },
    });

    if (!collectionType) {
      return res.status(404).json({ error: 'Collection type not found' });
    }

    const fields = (collectionType.fields as any)?.fields || [];

    if (req.method === 'GET') {
      const locale = await resolveRequestLocale(req.query);
      const defaultLocale = 'en';

      // :id is the rootId (translation group), never a per-locale primary key.
      // Find the row matching rootId + requested locale, fall back to default.
      let target: any = null;
      let resolvedLocale = locale;

      const rows: any = await findManyDynamic(name, {
        where: { rootId: id, locale },
      });
      const found = Array.isArray(rows) ? rows[0] : rows;

      if (found) {
        target = found;
        resolvedLocale = locale;
      } else if (locale !== defaultLocale) {
        const fallbackRows: any = await findManyDynamic(name, {
          where: { rootId: id, locale: defaultLocale },
        });
        const fallback = Array.isArray(fallbackRows) ? fallbackRows[0] : fallbackRows;
        if (fallback) {
          target = fallback;
          resolvedLocale = defaultLocale;
        }
      }

      if (!target) {
        return res.status(404).json({
          error: `Entry not found in locale "${locale}"`,
        });
      }

      // Never expose the per-locale primary key as the public API id.
      const { id: _pk, ...convertedEntry } = target;

      let finalEntry = await populateRelations(convertedEntry, name, fields);

      if (populate === 'true') {
        finalEntry = await populateComponents(finalEntry, fields);
      }

      return res.status(200).json({ data: finalEntry, rootId: id, locale: resolvedLocale });
    }

    if (req.method === 'PUT') {
      const { data: entryData } = req.body;

      if (!entryData || Object.keys(entryData).length === 0) {
        return res.status(400).json({ error: 'Missing entry data' });
      }

      const locale = await resolveRequestLocale(req.query);

      // Locate the specific locale row by rootId + locale.
      const existing: any = await findManyDynamic(name, {
        where: { rootId: id, locale },
      }) as any[];

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const localeId = existing[0].id;

      const convertedData: Record<string, any> = {};
      Object.keys(entryData).forEach(key => {
        convertedData[key] = entryData[key];
      });

      for (const field of fields) {
        if (field.unique && convertedData[field.name] !== undefined && convertedData[field.name] !== null && convertedData[field.name] !== '') {
          const existingEntry = await findManyDynamic(name, {
            where: { [field.name]: convertedData[field.name] }
          }) as any[];

          if (existingEntry && existingEntry.length > 0 && existingEntry[0].id !== localeId) {
            return res.status(400).json({
              error: `This ${field.displayName} already exists. The field "${field.displayName}" must be unique.`
            });
          }
        }
      }

      const processedData = await processComponentFields(convertedData, fields);
      const filteredData = filterVirtualRelationFields(fields, processedData);

      const entry = await updateDynamic(name, localeId, filteredData);
      return res.status(200).json({ data: entry });
    }

    if (req.method === 'PATCH') {
      const entryData = req.body;

      if (!entryData || Object.keys(entryData).length === 0) {
        return res.status(400).json({ error: 'Missing entry data' });
      }

      const locale = await resolveRequestLocale(req.query);

      const existing: any = await findManyDynamic(name, {
        where: { rootId: id, locale },
      }) as any[];

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const localeId = existing[0].id;

      const processedData = await processComponentFields(entryData, fields);
      const filteredData = filterVirtualRelationFields(fields, processedData);

      const entry = await updateDynamic(name, localeId, filteredData);
      return res.status(200).json({ data: entry });
    }

    if (req.method === 'DELETE') {
      const locale = await resolveRequestLocale(req.query);

      const existing: any = await findManyDynamic(name, {
        where: { rootId: id, locale },
      }) as any[];

      if (!existing || existing.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const localeId = existing[0].id;

      await deleteDynamic(name, localeId);
      return res.status(200).json({ message: 'Entry deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Public Collection Entry API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function processComponentFields(
  data: Record<string, any>,
  fields: Field[]
): Promise<Record<string, any>> {
  const processed = { ...data };

  for (const field of fields) {
    if (field.type !== 'component') continue;

    const value = data[field.name];
    if (!value) continue;

    try {
      if (field.multiple) {
        if (Array.isArray(value)) {
          processed[field.name] = await Promise.all(
            value.map(item => processComponentValue(item, field.componentRef!))
          );
        }
      } else {
        processed[field.name] = await processComponentValue(value, field.componentRef!);
      }
    } catch (error) {
      console.error(`[Process Components] Error processing field ${field.name}:`, error);
    }
  }

  return processed;
}

async function processComponentValue(value: any, componentName: string): Promise<string> {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value.id) {
    return value.id;
  }

  if (typeof value === 'object' && !value.id) {
    const entry = await createComponentEntry(componentName, value);
    return entry.id;
  }

  throw new Error(`Invalid component value: ${JSON.stringify(value)}`);
}

export default withApiToken(handler);
