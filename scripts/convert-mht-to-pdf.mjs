#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convert as convertMhtmlToHtml } from 'mhtml-to-html';
import wkhtmltopdf from 'wkhtmltopdf';
import pdf from 'html-pdf';
import { execFile } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const inFile = process.argv[2] || path.join(repoRoot, 'input-samples/Why is AI so slow to spread_ Economics can explain.mht');
  const outDir = process.argv[3] || path.join(repoRoot, 'data/uploads');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const lower = path.basename(inFile).toLowerCase();
  if (!lower.endsWith('.mht') && !lower.endsWith('.mhtml')) {
    console.error('Input must be .mht or .mhtml');
    process.exit(1);
  }

  const pdfName = lower.replace(/\.(mht|mhtml)$/i, '.pdf');
  const outPdf = path.join(outDir, pdfName);

  const buf = fs.readFileSync(inFile);
  let htmlString;
  try {
    let htmlOut = await convertMhtmlToHtml(buf);
    if (typeof htmlOut !== 'string') {
      if (htmlOut instanceof Uint8Array) {
        htmlOut = new TextDecoder().decode(htmlOut);
      } else if (htmlOut && typeof htmlOut.html === 'string') {
        htmlOut = htmlOut.html;
      } else if (htmlOut && typeof htmlOut.toString === 'function') {
        htmlOut = htmlOut.toString();
      } else {
        htmlOut = String(htmlOut);
      }
    }
    if (typeof htmlOut === 'string' && htmlOut.trim() && htmlOut !== '[object Object]') {
      htmlString = htmlOut;
    } else {
      throw new Error('Invalid HTML output from library');
    }
  } catch {
    // Fallback: use CLI to convert to a temporary HTML file
    const outHtml = path.join(outDir, pdfName.replace(/\.pdf$/i, '.html'));
    const bin = path.join(repoRoot, 'node_modules', '.bin', 'mhtml-to-html');
    await new Promise((resolve) => {
      execFile(bin, [inFile, '--output', outHtml], () => resolve());
    });
    let chosenHtml = outHtml;
    if (!fs.existsSync(chosenHtml)) {
      const defaultHtml = inFile.replace(/\.(mht|mhtml)$/i, '.html');
      if (fs.existsSync(defaultHtml)) chosenHtml = defaultHtml;
    }
    if (!fs.existsSync(chosenHtml)) {
      throw new Error('CLI fallback did not produce an HTML file');
    }
    htmlString = fs.readFileSync(chosenHtml, 'utf8');
  }

  // Ensure full HTML document
  const htmlFull = /<html[\s\S]*<\/html>/i.test(htmlString)
    ? htmlString
    : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${htmlString}</body></html>`;

  // Try wkhtmltopdf, fallback to html-pdf
  try {
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(outPdf);
      wkhtmltopdf(htmlFull, { pageSize: 'A4' })
        .on('error', reject)
        .pipe(out)
        .on('finish', resolve)
        .on('error', reject);
    });
    const stats = fs.statSync(outPdf);
    if (!stats.size) throw new Error('wkhtmltopdf produced zero-byte output');
    console.log('PDF written (wkhtmltopdf):', outPdf);
  } catch (e) {
    // fallback
    try { fs.existsSync(outPdf) && fs.unlinkSync(outPdf); } catch {}
    await new Promise((resolve, reject) => {
      pdf.create(htmlFull, { format: 'A4' }).toFile(outPdf, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log('PDF written (html-pdf):', outPdf);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


