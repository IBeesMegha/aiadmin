import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/middlewares/api/auth-middleware';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const baseUploadDir = path.join(process.cwd(), 'public', 'uploads', 'theme');

    const form = formidable({
      uploadDir: baseUploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024,
    });

    try {
      await fs.access(baseUploadDir);
    } catch {
      await fs.mkdir(baseUploadDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);

    if (!files.file || !files.file[0]) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    const file = files.file[0];
    const fileName = file.newFilename;
    const url = `/uploads/theme/${fileName}`;

    res.status(200).json({
      success: true,
      data: {
        url,
        name: file.originalFilename || fileName,
        mime: file.mimetype,
        size: file.size,
      },
    });
  } catch (error: any) {
    console.error('Error uploading theme file:', error);
    res.status(500).json({ success: false, error: error.message || 'Upload failed' });
  }
}

export default function (req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, handler);
}
