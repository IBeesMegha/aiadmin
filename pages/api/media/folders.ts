import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

// GET - Get all folders in uploads directory
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
      return res.status(200).json({ folders: [] });
    }

    // Read directory recursively to get all folders
    const folders: string[] = [];
    
    const scanDirectory = async (dir: string, relativePath: string = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          folders.push(folderPath);
          
          // Recursively scan subdirectories
          await scanDirectory(path.join(dir, entry.name), folderPath);
        }
      }
    };
    
    await scanDirectory(uploadsDir);
    
    res.status(200).json({ folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
}

// POST - Create a new folder
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const newFolderPath = path.join(uploadsDir, folderPath);
    
    // Create the folder
    await fs.mkdir(newFolderPath, { recursive: true });
    
    res.status(201).json({ success: true, folderPath });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
