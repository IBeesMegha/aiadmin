import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// GET - Get single media asset
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    const media = await prisma.media.findUnique({
      where: { id: id as string },
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.status(200).json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
}

// PUT - Update media details
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const { name, alternativeText, caption } = req.body;

    const media = await prisma.media.update({
      where: { id: id as string },
      data: {
        ...(name && { name }),
        ...(alternativeText !== undefined && { alternativeText }),
        ...(caption !== undefined && { caption }),
      },
    });

    res.status(200).json(media);
  } catch (error) {
    console.error('Error updating media:', error);
    res.status(500).json({ error: 'Failed to update media' });
  }
}

// DELETE - Delete media asset
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    const media = await prisma.media.findUnique({
      where: { id: id as string },
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Delete file if it's a local upload
    if (media.url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', media.url);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
        // Continue even if file deletion fails
      }
    }

    await prisma.media.delete({
      where: { id: id as string },
    });

    res.status(200).json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'PUT':
      return handlePut(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
