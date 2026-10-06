import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid single type name' });
  }

  try {
    const singleType = await prisma.singleType.findUnique({
      where: { name },
    });

    if (!singleType) {
      return res.status(404).json({ error: 'Single type not found' });
    }

    return res.status(200).json({
      raw: singleType,
      fieldsType: typeof singleType.fields,
      fieldsValue: singleType.fields,
      fieldsKeys: singleType.fields ? Object.keys(singleType.fields as any) : [],
      fieldsFieldsExists: singleType.fields && typeof singleType.fields === 'object' && 'fields' in singleType.fields,
      fieldsFieldsValue: singleType.fields && typeof singleType.fields === 'object' && 'fields' in singleType.fields ? (singleType.fields as any).fields : null,
    });
  } catch (error: any) {
    console.error('Debug API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
