import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'data/uploads');

export async function GET({ params }: RequestEvent) {
  try {
    const { filename } = params;
    
    if (!filename) {
      throw error(400, 'Filename is required');
    }

    // Sanitize the filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(uploadDir, sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw error(404, 'File not found');
    }

    // Only serve PDF files for security
    if (!sanitizedFilename.toLowerCase().endsWith('.pdf')) {
      throw error(400, 'Only PDF files can be served');
    }

    // Read the file
    const fileBuffer = await readFile(filePath);

    // Return the PDF file with appropriate headers
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${sanitizedFilename}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (err) {
    console.error('Error serving file:', err);
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Internal server error');
  }
}
