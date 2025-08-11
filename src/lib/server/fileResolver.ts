import { readFile } from 'fs/promises';
import path from 'path';

const fileTagsPath = path.join(process.cwd(), 'data', 'file-tags.json');

export async function resolveFilesFromTags(tags: string[]): Promise<string[]> {
  let tagMap: Record<string, string[]> = {};
  try {
    const raw = await readFile(fileTagsPath, 'utf-8');
    tagMap = JSON.parse(raw) || {};
  } catch {
    tagMap = {};
  }
  const resolved = Object.entries(tagMap)
    // OR semantics: include a file if it has at least one of the requested tags
    .filter(([, fileTags]) => Array.isArray(fileTags) && tags.some(tag => fileTags.includes(tag)))
    .map(([filename]) => filename)
    .filter((filename) => filename.toLowerCase().endsWith('.pdf'));
  return Array.from(new Set(resolved));
}

export function normalizeFileList(files: unknown): string[] {
  if (!Array.isArray(files)) return [];
  return files
    .filter((f): f is string => typeof f === 'string' && f.toLowerCase().endsWith('.pdf'))
    .map(f => path.basename(f));
}
