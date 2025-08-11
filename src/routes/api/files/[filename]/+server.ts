import type { RequestEvent } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
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

export async function DELETE({ params }: RequestEvent) {
  try {
    const { filename } = params;
    
    if (!filename) {
      throw error(400, 'Filename is required');
    }

    // Sanitize the filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(uploadDir, sanitizedFilename);
    const metaPath = path.join(uploadDir, `${sanitizedFilename}.meta.json`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw error(404, 'File not found');
    }

    // Delete the main file
    await fs.promises.unlink(filePath);

    // Delete metadata file if it exists
    if (fs.existsSync(metaPath)) {
      await fs.promises.unlink(metaPath);
    }

    // Remove from file-tags.json
    const dataDir = path.join(process.cwd(), 'data');
    const tagsFilePath = path.join(dataDir, 'file-tags.json');
    
    if (fs.existsSync(tagsFilePath)) {
      try {
        const tagsContent = await readFile(tagsFilePath, 'utf-8');
        const fileTagMap = JSON.parse(tagsContent);
        
        // Remove the file from the tags map
        if (fileTagMap[sanitizedFilename]) {
          delete fileTagMap[sanitizedFilename];
          await writeFile(tagsFilePath, JSON.stringify(fileTagMap, null, 2));
        }
      } catch (tagsError) {
        console.warn('Failed to update file tags during deletion:', tagsError);
        // Don't fail the deletion if tags cleanup fails
      }
    }

    return json({ 
      message: 'File deleted successfully',
      filename: sanitizedFilename 
    });

  } catch (err) {
    console.error('Error deleting file:', err);
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Internal server error');
  }
}
