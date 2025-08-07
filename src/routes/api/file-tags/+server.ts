import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';

type FileTagMap = Record<string, string[]>;

const dataDir = path.join(process.cwd(), 'data');
const tagsFilePath = path.join(dataDir, 'file-tags.json');

async function ensureDataFile(): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(tagsFilePath)) {
    await writeFile(tagsFilePath, JSON.stringify({}, null, 2));
  }
}

async function getFileTagMap(): Promise<FileTagMap> {
  await ensureDataFile();
  const raw = await readFile(tagsFilePath, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as FileTagMap;
    }
    return {};
  } catch {
    return {};
  }
}

async function saveFileTagMap(map: FileTagMap): Promise<void> {
  await ensureDataFile();
  await writeFile(tagsFilePath, JSON.stringify(map, null, 2));
}

// GET /api/file-tags - Get tag mapping for all files, or a single file via ?file=filename
export async function GET({ url }: RequestEvent) {
  try {
    const file = url.searchParams.get('file');
    const map = await getFileTagMap();
    if (file) {
      return json(map[file] ?? []);
    }
    return json(map);
  } catch (error) {
    console.error('Error reading file tags:', error);
    return json({ message: 'Error reading file tags.' }, { status: 500 });
  }
}

// PUT /api/file-tags - Update tags for a specific file
// Body: { file: string, tags: string[] }
export async function PUT({ request }: RequestEvent) {
  try {
    const body = await request.json();
    const file: unknown = body?.file;
    const tags: unknown = body?.tags;

    if (typeof file !== 'string' || !Array.isArray(tags) || tags.some(t => typeof t !== 'string')) {
      return json({ message: 'Invalid payload' }, { status: 400 });
    }

    const trimmedUnique = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)));
    const map = await getFileTagMap();
    map[file] = trimmedUnique;
    await saveFileTagMap(map);
    return json({ file, tags: trimmedUnique });
  } catch (error) {
    console.error('Error updating file tags:', error);
    return json({ message: 'Error updating file tags.' }, { status: 500 });
  }
}

