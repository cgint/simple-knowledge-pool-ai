#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const inputArgs = process.argv.slice(2);

  // Defaults to the provided sample MHT if no args supplied
  const defaultInput = path.join(
    repoRoot,
    'input-samples/Why is AI so slow to spread_ Economics can explain.mht'
  );
  const inputs = inputArgs.length ? inputArgs : [defaultInput];

  // Validate inputs
  for (const p of inputs) {
    if (!fs.existsSync(p)) {
      console.error('Input not found:', p);
      process.exit(1);
    }
  }

  // Lazy import to avoid load if not installed
  const aw = await import('@aspose/words');

  const outDir = path.join(repoRoot, 'data/uploads');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  if (inputs.length === 1) {
    const inFile = inputs[0];
    const base = path.basename(inFile).replace(/\.(mht|mhtml)$/i, '');
    const outPdf = path.join(outDir, `${base}.aspose.pdf`);

    const doc = new aw.Document(inFile);
    await doc.save(outPdf); // infers PDF from extension
    const size = fs.statSync(outPdf).size;
    console.log('Aspose PDF written:', outPdf, `(${size} bytes)`);
    return;
  }

  // Multiple files: append into a single PDF
  const outPdf = path.join(outDir, 'merged.aspose.pdf');
  const output = new aw.Document();
  output.removeAllChildren();
  for (const inFile of inputs) {
    const inputDoc = new aw.Document(inFile);
    output.appendDocument(inputDoc, aw.ImportFormatMode.KeepSourceFormatting);
  }
  await output.save(outPdf);
  const size = fs.statSync(outPdf).size;
  console.log('Aspose merged PDF written:', outPdf, `(${size} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


