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

// MHT -> HTML conversion (no browser)
import { convert as convertMhtmlToHtml } from 'mhtml-to-html';
// HTML -> PDF rendering (no browser)
import wkhtmltopdf from 'wkhtmltopdf';

export async function POST(event: RequestEvent) {
  try {
    const formData = await event.request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return json({ message: 'No files were uploaded.' }, { status: 400 });
    }

    const uploadedFileNames: string[] = [];
    const generatedPdfNames: string[] = [];

    for (const file of files) {
      const filePath = path.join(uploadDir, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      uploadedFileNames.push(file.name);

      // If an MHT/MHTML file was uploaded, convert and store a PDF alongside it
      const lowerName = file.name.toLowerCase();
      const isMht = lowerName.endsWith('.mht') || lowerName.endsWith('.mhtml');
      if (isMht) {
        try {
          const htmlString = await convertMhtmlToHtml(buffer);
          const pdfBasename = lowerName.replace(/\.(mht|mhtml)$/i, '.pdf');
          const pdfPath = path.join(uploadDir, pdfBasename);

          await new Promise<void>((resolve, reject) => {
            const out = fs.createWriteStream(pdfPath);
            wkhtmltopdf(htmlString, { pageSize: 'A4' })
              .on('error', reject)
              .pipe(out)
              .on('finish', () => resolve())
              .on('error', reject);
          });

          generatedPdfNames.push(pdfBasename);
        } catch (convErr) {
          console.error('MHT to PDF conversion failed for', file.name, convErr);
        }
      }
    }

    return json(
      { 
        message: 'Files uploaded successfully.',
        files: uploadedFileNames,
        generatedPdfs: generatedPdfNames
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('File upload error:', error);
    return json({ message: 'An unexpected error occurred during file upload.' }, { status: 500 });
  }
}
