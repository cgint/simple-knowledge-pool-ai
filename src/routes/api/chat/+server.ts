import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';
import { callLLM } from '$lib/server/llm.js';
import type { ChatMessage } from '$lib/types/chat.js';
import { resolveFilesFromTags, normalizeFileList } from '$lib/server/fileResolver.js';

const uploadsDir = path.join(process.cwd(), 'data', 'uploads');

async function getFilePartsFromFiles(filenames: string[]): Promise<{ mimeType: string; dataBase64: string }[]> {
  const uniquePdfFiles = Array.from(new Set(
    filenames
      .map((name) => path.basename(name))
      .filter((name) => name.toLowerCase().endsWith('.pdf'))
  ));

  const parts: { mimeType: string; dataBase64: string }[] = [];
  for (const filename of uniquePdfFiles) {
    try {
      const absPath = path.join(uploadsDir, filename);
      const buf = await readFile(absPath);
      parts.push({ mimeType: 'application/pdf', dataBase64: buf.toString('base64') });
    } catch (error) {
      console.error('Skipping file (cannot read):', filename, error);
    }
  }
  return parts;
}

async function processWithLLM(
  poolContext: string,
  history: ChatMessage[],
  userMessage: string,
  fileParts?: { mimeType: string; dataBase64: string }[]
): Promise<string> {
  const response = await callLLM(poolContext, history, userMessage, undefined, fileParts);
  return response.content;
}

export async function POST({ request }: RequestEvent) {
  try {
    // JSON-only input: { history, message, tags?, files? }
    const body = await request.json();
    const tags: unknown = body?.tags;
    const files: unknown = body?.files;
    const message: string | undefined = body?.message;
    const history: ChatMessage[] | undefined = body?.history;

    if (!message) {
      return json({ error: 'Message is required' }, { status: 400 });
    }

    // Build final list of filenames from tags (if provided) and direct files (if provided)
    const filenamesSet = new Set<string>();
    if (Array.isArray(tags) && tags.length > 0) {
      const fromTags = await resolveFilesFromTags(tags as string[]);
      for (const f of fromTags) filenamesSet.add(f);
    }
    const normalizedFiles = normalizeFileList(files);
    for (const f of normalizedFiles) {
      filenamesSet.add(f);
    }

    const filenames = Array.from(filenamesSet);
    console.log('Filenames of files sent to LLM: ', filenames);
    const fileParts = filenames.length > 0 ? await getFilePartsFromFiles(filenames) : undefined;
    // Call LLM with history, message, and file parts (no textual pool context)
    const response = await processWithLLM('', history || [], message, fileParts && fileParts.length > 0 ? fileParts : undefined);

    return json({
      response,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}