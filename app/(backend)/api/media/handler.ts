export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { authMiddleware } from '@/lib/middlewares/api/auth-middleware';
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

import { prisma } from '@/lib/prisma';

import { parseMultipart } from '@/lib/multipart-parser';

export const config = {
  api: {
    bodyParser: false,
  },
};

// GET - Get all media assets
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { folder } = req.query;
    
    // Build query filter
    const where: any = {};
    
    if (folder !== undefined) {
      if (folder === '') {
        // Root folder: get files with no folder
        where.folder = null;
      } else {
        // Specific folder: get files in that folder
        where.folder = folder as string;
      }
    }
    
    const media = await prisma.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    console.log('[Media API GET] Returning', media.length, 'media items');
    if (media.length > 0) {
      console.log('[Media API GET] Sample:', media[0]);
    }

    res.status(200).json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
}

// POST - Upload new media
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[Media Upload] Starting upload process');
    const baseUploadDir = path.join(process.cwd(), 'public', 'uploads');

    try {
      await fs.access(baseUploadDir);
    } catch {
      console.log('[Media Upload] Creating base upload directory');
      await fs.mkdir(baseUploadDir, { recursive: true });
    }

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Invalid multipart form data' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);

    if (body.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Request too large (max 10MB)' });
    }

    console.log('[Media Upload] Parsing form data');
    const { fields, files } = parseMultipart(body, boundaryMatch[1]);
    
    const folder = fields.folder?.[0] || '';
    console.log('[Media Upload] Folder:', folder);

    let mediaData: any = {};

    // Handle file upload
    if (files.file && files.file[0]) {
      const file = files.file[0];
      const ext = path.extname(file.filename) || '';
      const fileName = randomUUID() + ext;
      console.log('[Media Upload] Processing file:', fileName);

      let url = `/uploads/${fileName}`;

      if (folder) {
        const folderPath = path.join(baseUploadDir, folder);
        console.log('[Media Upload] Creating folder:', folderPath);
        try {
          await fs.mkdir(folderPath, { recursive: true });
        } catch (err) {
          console.error('[Media Upload] Error creating folder:', err);
        }

        await fs.writeFile(path.join(folderPath, fileName), file.data);
        url = `/uploads/${folder}/${fileName}`;
      } else {
        await fs.writeFile(path.join(baseUploadDir, fileName), file.data);
      }

      mediaData = {
        name: fields.name?.[0] || file.filename || fileName,
        url,
        mime: file.mimetype || 'application/octet-stream',
        size: file.data.length,
        ext: path.extname(file.filename || fileName),
        alternativeText: fields.alternativeText?.[0] || '',
        caption: fields.caption?.[0] || '',
        folder: folder || null,
      };

      console.log('[Media Upload] Media data prepared:', mediaData);
    }
    // Handle URL upload
    else if (fields.url && fields.url[0]) {
      const url = fields.url[0];
      const fileName = fields.name?.[0] || url.split('/').pop() || 'image';
      const ext = path.extname(fileName) || '.jpg';

      mediaData = {
        name: fileName,
        url,
        mime: `image/${ext.slice(1)}`,
        size: 0,
        ext,
        alternativeText: fields.alternativeText?.[0] || '',
        caption: fields.caption?.[0] || '',
        folder: folder || null,
      };
      
      console.log('[Media Upload] URL media data prepared:', mediaData);
    } else {
      console.error('[Media Upload] No file or URL provided');
      return res.status(400).json({ error: 'No file or URL provided' });
    }

    console.log('[Media Upload] Saving to database');
    
    const media = await prisma.media.create({
      data: mediaData,
    });

    console.log('[Media Upload] Upload successful, media ID:', media.id);
    res.status(201).json(media);
  } catch (error: any) {
    console.error('[Media Upload] Error uploading media:', error);
    console.error('[Media Upload] Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to upload media' });
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);
