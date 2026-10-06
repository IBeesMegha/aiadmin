import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { findManyDynamic, createDynamic } from '@/lib/dynamic-prisma';
import { ApiResponse, Field } from '@/lib/types';
import { filterVirtualRelationFields } from '@/lib/relation-engine';
import { populateMultipleEntries, createComponentEntry } from '@/lib/component-populate';
import { resolveMultipleRelations } from '@/lib/relation-resolver';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(
  req: ApiTokenRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { name, populate } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid collection name' });
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
      let entries: any = await findManyDynamic(name, {});

      const convertedEntries = entries.map((entry: any) => {
        return { ...entry };
      });

      let finalEntries = await resolveMultipleRelations(convertedEntries, name, fields);

      if (populate === 'true') {
        finalEntries = await populateMultipleEntries(finalEntries, fields);
      }

      return res.status(200).json({ data: finalEntries });
    }

    if (req.method === 'POST') {
      const { data: entryData } = req.body;

      if (!entryData || Object.keys(entryData).length === 0) {
        return res.status(400).json({ error: 'Missing entry data' });
      }

      const convertedData: Record<string, any> = {};
      Object.keys(entryData).forEach(key => {
        convertedData[key] = entryData[key];
      });

      for (const field of fields) {
        if (field.unique && convertedData[field.name] !== undefined && convertedData[field.name] !== null && convertedData[field.name] !== '') {
          const existingEntry = await findManyDynamic(name, {
            where: { [field.name]: convertedData[field.name] }
          }) as any[];

          if (existingEntry && existingEntry.length > 0) {
            return res.status(400).json({
              error: `This ${field.displayName} already exists. The field "${field.displayName}" must be unique.`
            });
          }
        }
      }

      const processedData = await processComponentFields(convertedData, fields);
      const filteredData = filterVirtualRelationFields(fields, processedData);

      const entry = await createDynamic(name, filteredData);
      return res.status(201).json({ data: entry });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Public Collections API Error:', error);
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
