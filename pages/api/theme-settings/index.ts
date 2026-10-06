import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middlewares/api/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      await handleGet(req, res);
      break;
    case 'PUT':
      await handlePut(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    let settings = await prisma.themeSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!settings) {
      settings = await prisma.themeSettings.create({
        data: {},
      });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching theme settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch theme settings' });
  }
}

async function handlePut(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      res.status(400).json({ success: false, error: 'Invalid request body' });
      return;
    }

    const allowedFields = [
      'primaryColor', 'secondaryColor', 'accentColor',
      'successColor', 'warningColor', 'errorColor',
      'backgroundColor', 'cardBackgroundColor', 'sidebarBackgroundColor',
      'headerBackgroundColor', 'textColor', 'borderColor',
      'primaryLogo', 'darkLogo', 'favicon', 'loginLogo', 'loginBackground',
      'loginTitle', 'loginSubtitle',
      'fontFamily', 'fontScale', 'headingWeight', 'bodyWeight',
      'sidebarWidth', 'borderRadius', 'buttonRadius', 'cardRadius',
      'compactMode', 'customCss',
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    let settings = await prisma.themeSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (settings) {
      settings = await prisma.themeSettings.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.themeSettings.create({
        data: data as any,
      });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating theme settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update theme settings' });
  }
}

export default function (req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, handler);
}
