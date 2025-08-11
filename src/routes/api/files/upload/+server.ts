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
import { execFile } from 'child_process';

/**
 * Sanitizes a filename to be safe for file system storage.
 * Removes path components and replaces invalid characters with underscores.
 * @param filename The original filename.
 * @returns A sanitized filename.
 */
function sanitizeFilename(filename: string): string {
  // Get just the base name to prevent directory traversal
  const basename = path.basename(filename);
  // Replace characters that are generally unsafe or problematic in filenames
  // This includes /, \, ?, %, *, :, |, ", <, >, ., and control characters.
  // We keep dots for file extensions, but ensure they are not leading/trailing.
  let sanitized = basename
    .replace(/[/?%*:|"<>]/g, '_') // Replace common invalid characters
    .replace(/[\x00-\x1F\x7F]/g, '_') // Remove control characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with a single one
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Ensure no leading/trailing dots, which can be problematic on some systems
  sanitized = sanitized.replace(/^\.+|\.+$/g, '');

  // If the filename becomes empty after sanitization, provide a default
  if (!sanitized) {
    return `untitled_${Date.now()}`;
  }

  return sanitized;
}

interface FileMetadata {
  originalFilename: string;
  sourceMhtFile?: string; // Original MHT filename if this PDF was converted from one
  uploadedAt: number;
}

async function saveFileMetadata(sanitizedFileName: string, metadata: FileMetadata): Promise<void> {
  const metadataFilePath = path.join(uploadDir, `${sanitizedFileName}.meta.json`);
  await writeFile(metadataFilePath, JSON.stringify(metadata, null, 2));
}

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
      const originalFileName = file.name;
      const sanitizedFileName = sanitizeFilename(originalFileName);
      const filePath = path.join(uploadDir, sanitizedFileName);
      const buffer = Buffer.from(await file.arrayBuffer());

      // Save the original file
      await writeFile(filePath, buffer);
      uploadedFileNames.push(sanitizedFileName);

      // Save metadata for the original file
      await saveFileMetadata(sanitizedFileName, {
        originalFilename: originalFileName,
        uploadedAt: Date.now(),
      });

      // If an MHT/MHTML file was uploaded, convert and store a PDF alongside it
      const lowerName = originalFileName.toLowerCase();
      const isMht = lowerName.endsWith('.mht') || lowerName.endsWith('.mhtml');
      if (isMht) {
        try {
          let htmlString: string | undefined;
          try {
            let htmlOut: unknown = await convertMhtmlToHtml(buffer);
            if (typeof htmlOut !== 'string') {
              if (htmlOut instanceof Uint8Array) {
                htmlOut = new TextDecoder().decode(htmlOut);
              } else if (htmlOut && typeof (htmlOut as any).html === 'string') {
                htmlOut = (htmlOut as any).html as string;
              } else if (htmlOut && typeof (htmlOut as any).toString === 'function') {
                htmlOut = (htmlOut as any).toString();
              } else {
                htmlOut = String(htmlOut);
              }
            }
            if (typeof htmlOut === 'string' && htmlOut.trim() && htmlOut !== '[object Object]') {
              htmlString = htmlOut;
            } else {
              throw new Error('Invalid HTML output');
            }
          } catch (htmlErr) {
            console.error('=== HTML conversion (library) failed, trying CLI fallback ===');
            console.error('File:', {
              originalName: file.name,
              sanitizedName: sanitizedFileName,
              size: buffer.length,
              path: filePath
            });
            console.error('HTML conversion error:', {
              message: htmlErr instanceof Error ? htmlErr.message : String(htmlErr),
              stack: htmlErr instanceof Error ? htmlErr.stack : undefined,
              type: typeof htmlErr
            });
            
            // Fallback to CLI converter into a temp file
            const tmpHtml = path.join(uploadDir, sanitizedFileName.replace(/\.(mht|mhtml)$/i, '.html'));
            try {
              await new Promise<void>((resolve, reject) => {
                const bin = path.join(process.cwd(), 'node_modules', '.bin', 'mhtml-to-html');
                execFile(bin, [filePath, '--output', tmpHtml], (err) => (err ? reject(err) : resolve()));
              });
              htmlString = fs.readFileSync(tmpHtml, 'utf8');
              console.log('=== CLI fallback HTML conversion succeeded ===');
              console.log('Source file:', file.name);
              console.log('Temp HTML file:', tmpHtml);
              console.log('HTML content length:', htmlString.length, 'characters');
            } catch (cliErr) {
              console.error('CLI fallback also failed:', {
                message: cliErr instanceof Error ? cliErr.message : String(cliErr),
                stack: cliErr instanceof Error ? cliErr.stack : undefined,
                binPath: path.join(process.cwd(), 'node_modules', '.bin', 'mhtml-to-html'),
                tmpHtmlPath: tmpHtml
              });
              throw cliErr; // Re-throw to trigger outer catch
            }
          }
          const pdfBasename = sanitizedFileName.replace(/\.(mht|mhtml)$/i, '.pdf');
          const pdfPath = path.join(uploadDir, pdfBasename);

          // Generate PDF using wkhtmltopdf (installed in the Docker image)
          try {
            await new Promise<void>((resolve, reject) => {
              const out = fs.createWriteStream(pdfPath);
              wkhtmltopdf(htmlString, { pageSize: 'A4' })
                .on('error', reject)
                .pipe(out)
                .on('finish', () => resolve())
                .on('error', reject);
            });
            const s = fs.statSync(pdfPath);
            if (!s.size) throw new Error('wkhtmltopdf produced zero bytes');

            console.log('=== PDF conversion successful ===');
            console.log('Source file:', file.name);
            console.log('Generated PDF:', pdfBasename);
            console.log('PDF size:', s.size, 'bytes');
            console.log('HTML content length:', htmlString?.length || 0, 'characters');

            generatedPdfNames.push(pdfBasename);

            // Save metadata for the generated PDF
            await saveFileMetadata(pdfBasename, {
              originalFilename: pdfBasename, // The name of the generated PDF
              sourceMhtFile: originalFileName, // The original MHT file it came from
              uploadedAt: Date.now(),
            });

          } catch (wkErr) {
            console.error('=== wkhtmltopdf PDF conversion failed ===');
            console.error('File:', {
              originalName: file.name,
              sanitizedName: sanitizedFileName,
              size: buffer.length,
              path: filePath
            });
            console.error('Target PDF path:', pdfPath);
            console.error('HTML content length:', htmlString?.length || 0);
            console.error('Error details:', {
              message: wkErr instanceof Error ? wkErr.message : String(wkErr),
              stack: wkErr instanceof Error ? wkErr.stack : undefined,
              type: typeof wkErr,
              errorCode: (wkErr as any)?.code,
              errno: (wkErr as any)?.errno,
              syscall: (wkErr as any)?.syscall
            });
            console.error('================================================');
            // Continue processing other files even if one conversion fails
          }
        } catch (convErr) {
          console.error('=== Overall MHT to PDF conversion failed ===');
          console.error('File:', {
            originalName: file.name,
            sanitizedName: sanitizedFileName,
            size: buffer.length,
            path: filePath,
            isMht: isMht,
            lowerName: lowerName
          });
          console.error('Conversion process failed at top level:', {
            message: convErr instanceof Error ? convErr.message : String(convErr),
            stack: convErr instanceof Error ? convErr.stack : undefined,
            type: typeof convErr,
            errorCode: (convErr as any)?.code,
            errno: (convErr as any)?.errno,
            syscall: (convErr as any)?.syscall
          });
          console.error('Upload directory:', uploadDir);
          console.error('Expected PDF path would have been:', path.join(uploadDir, sanitizedFileName.replace(/\.(mht|mhtml)$/i, '.pdf')));
          console.error('================================================');
          // Continue processing other files even if one conversion fails
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
    console.error('=== File upload process failed ===');
    console.error('Upload directory:', uploadDir);
    console.error('Request details:', {
      method: event.request.method,
      url: event.request.url,
      headers: Object.fromEntries(event.request.headers.entries())
    });
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      errorCode: (error as any)?.code,
      errno: (error as any)?.errno,
      syscall: (error as any)?.syscall
    });
    console.error('================================================');
    return json({ message: 'An unexpected error occurred during file upload.' }, { status: 500 });
  }
}
