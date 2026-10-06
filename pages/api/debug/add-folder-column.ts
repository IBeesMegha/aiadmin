import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to add the folder column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE media ADD COLUMN IF NOT EXISTS folder TEXT;
    `);
    
    res.status(200).json({ 
      success: true,
      message: 'Folder column added (or already exists)'
    });
  } catch (error: any) {
    console.error('Error adding folder column:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
