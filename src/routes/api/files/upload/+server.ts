import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';
import path from 'path';

// Ensure the uploads directory exists
import fs from 'fs';
const uploadDir = path.join(process.cwd(), 'data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(event: RequestEvent) {
  try {
    const formData = await event.request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return json({ message: 'No files were uploaded.' }, { status: 400 });
    }

    const uploadedFileNames: string[] = [];

    for (const file of files) {
      const filePath = path.join(uploadDir, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      uploadedFileNames.push(file.name);
    }

    return json(
      { 
        message: 'Files uploaded successfully.',
        files: uploadedFileNames 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('File upload error:', error);
    return json({ message: 'An unexpected error occurred during file upload.' }, { status: 500 });
  }
}
