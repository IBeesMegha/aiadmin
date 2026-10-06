import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Testing Prisma client...');
    console.log('Prisma object:', typeof prisma);
    console.log('Prisma.user:', typeof prisma?.user);
    
    await prisma.$connect();
    console.log('Connected to database');
    
    const users = await prisma.user.findMany();
    console.log('Found users:', users.length);
    
    return res.status(200).json({
      success: true,
      prismaType: typeof prisma,
      userModelType: typeof prisma?.user,
      usersCount: users.length,
      users: users.map(u => ({ id: u.id, email: u.email, name: u.name }))
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
