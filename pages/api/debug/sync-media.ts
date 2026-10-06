import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

function scanDirectory(dir: string, baseDir: string): any[] {
  const files: any[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = scanDirectory(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Get file stats
        const stats = fs.statSync(fullPath);
        const relativePath = path.relative(baseDir, fullPath);
        const urlPath = '/' + relativePath.replace(/\\/g, '/');
        
        // Extract folder from path
        const pathParts = relativePath.split(path.sep);
        const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : null;
        
        files.push({
          name: entry.name,
          url: urlPath,
          mime: getMimeType(entry.name),
          size: stats.size,
          ext: path.extname(entry.name),
          folder: folder,
        });
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', error);
  }

  return files;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    console.log('Scanning uploads directory:', uploadsDir);
    
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).json({ error: 'Uploads directory does not exist' });
    }

    const files = scanDirectory(uploadsDir, path.join(process.cwd(), 'public'));
    
    console.log(`Found ${files.length} files`);
    
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        // Check if file already exists in database
        const existing = await prisma.media.findFirst({
          where: { url: file.url },
        });
        
        if (existing) {
          console.log(`Skipping ${file.url} (already in database)`);
          skipped++;
          continue;
        }
        
        // Add to database
        await prisma.media.create({
          data: file,
        });
        
        console.log(`Added ${file.url} to database`);
        added++;
      } catch (error: any) {
        console.error(`Error adding ${file.url}:`, error);
        errors.push(`${file.url}: ${error.message}`);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Sync complete',
      added,
      skipped,
      total: files.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
