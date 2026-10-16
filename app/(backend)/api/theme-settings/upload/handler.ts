export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

import { withAuth, AuthenticatedRequest } from '@/lib/middlewares/api/auth-middleware';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseMultipart(body: Buffer, boundary: string): { fields: Record<string, string[]>; files: Record<string, { filename: string; mimetype: string; data: Buffer }[]> } {
  const fields: Record<string, string[]> = {};
  const files: Record<string, { filename: string; mimetype: string; data: Buffer }[]> = {};
  const delimiter = Buffer.from('--' + boundary);
  let start = body.indexOf(delimiter) + delimiter.length;

  while (start < body.length) {
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break;

    start += 2;
    const headersEnd = body.indexOf('\r\n\r\n', start);
    if (headersEnd === -1) break;
    const headers = body.slice(start, headersEnd).toString();
    const contentDisposition = headers.split('\r\n').find((h) => h.toLowerCase().startsWith('content-disposition'));
    if (!contentDisposition) break;

    const nameMatch = contentDisposition.match(/name="([^"]+)"/);
    const filenameMatch = contentDisposition.match(/filename="([^"]*)"/);
    if (!nameMatch) break;
    const name = nameMatch[1];

    const dataStart = headersEnd + 4;
    let dataEnd = body.indexOf(delimiter, dataStart);
    if (dataEnd === -1) break;
    while (dataEnd > 0 && (body[dataEnd - 1] === 0x0d || body[dataEnd - 1] === 0x0a)) dataEnd--;

    if (filenameMatch && filenameMatch[1]) {
      const mimeMatch = headers.split('\r\n').find((h) => h.toLowerCase().startsWith('content-type'));
      files[name] = files[name] || [];
      files[name].push({
        filename: filenameMatch[1],
        mimetype: mimeMatch ? mimeMatch.split(':')[1].trim() : 'application/octet-stream',
        data: body.slice(dataStart, dataEnd),
      });
    } else {
      fields[name] = fields[name] || [];
      fields[name].push(body.slice(dataStart, dataEnd).toString());
    }

    start = dataEnd + delimiter.length;
  }

  return { fields, files };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      res.status(400).json({ success: false, error: 'Invalid multipart form data' });
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);

    const { files } = parseMultipart(body, boundaryMatch[1]);
    if (!files.file || !files.file[0]) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    const uploadedFile = files.file[0];
    if (uploadedFile.data.length > 5 * 1024 * 1024) {
      res.status(400).json({ success: false, error: 'File too large (max 5MB)' });
      return;
    }

    const ext = path.extname(uploadedFile.filename) || '';
    const fileName = randomUUID() + ext;
    const baseUploadDir = path.join(process.cwd(), 'public', 'uploads', 'theme');

    try {
      await fs.access(baseUploadDir);
    } catch {
      await fs.mkdir(baseUploadDir, { recursive: true });
    }

    await fs.writeFile(path.join(baseUploadDir, fileName), uploadedFile.data);

    const url = `/uploads/theme/${fileName}`;
    res.status(200).json({
      success: true,
      data: {
        url,
        name: uploadedFile.filename,
        mime: uploadedFile.mimetype,
        size: uploadedFile.data.length,
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
