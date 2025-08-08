import { json } from '@sveltejs/kit';
import { readdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'data/uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// GET /api/files - Get all uploaded file names
export async function GET() {
  try {
    const files = await readdir(uploadDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    return json(pdfFiles);
  } catch (error) {
    console.error('Error reading upload directory:', error);
    // If the directory doesn't exist, return an empty array
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return json([]);
    }
    return json({ message: 'Error reading uploaded files.' }, { status: 500 });
  }
}
