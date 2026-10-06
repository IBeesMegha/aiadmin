import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const count = await prisma.media.count();
    const allMedia = await prisma.media.findMany({
      select: {
        id: true,
        name: true,
        url: true,
        folder: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.status(200).json({ 
      count, 
      media: allMedia,
      message: `Found ${count} media records in database`
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
