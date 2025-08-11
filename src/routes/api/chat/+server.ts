import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';
import { callLLM } from '$lib/server/llm.js';
import type { ChatMessage } from '$lib/types/chat.js';

const fileTagsPath = path.join(process.cwd(), 'data', 'file-tags.json');
const uploadsDir = path.join(process.cwd(), 'data', 'uploads');

async function getFileContent(filename: string): Promise<string> {
  try {
    const filePath = path.join(uploadsDir, filename);
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read file ${filename}:`, error);
    return `[Error reading file: ${filename}]`;
  }
}

async function buildContextFromTags(tags: string[]): Promise<string> {
  let map: Record<string, string[]> = {};
  try {
    const raw = await readFile(fileTagsPath, 'utf-8');
    map = JSON.parse(raw) || {};
  } catch {
    map = {};
  }
  const files = Object.entries(map)
    .filter(([, fileTags]) => Array.isArray(fileTags) && tags.every(t => fileTags.includes(t)))
    .map(([file]) => file);
  if (files.length === 0) {
    return 'No files match the selected tags.';
  }
  const contents = await Promise.all(
    files.map(async (filename) => {
      const content = await getFileContent(filename);
      return `--- File: ${filename} ---\n${content}\n`;
    })
  );
  return contents.join('\n');
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
    // Support both JSON body and multipart form with an attached file
    let tags: string[] | undefined;
    let message: string | undefined;
    let history: ChatMessage[] | undefined;
    let fileParts: { mimeType: string; dataBase64: string }[] | undefined;
    let fileFromSession: string | undefined;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const tagsRaw = form.get('tags') as string | undefined;
      message = form.get('message') as string | undefined;
      const historyStr = form.get('history') as string | undefined;
      if (historyStr) {
        try { history = JSON.parse(historyStr) as ChatMessage[]; } catch {}
      }
      if (tagsRaw) {
        try { const parsed = JSON.parse(tagsRaw); if (Array.isArray(parsed)) tags = parsed as string[]; } catch {}
      }
      const fileNameRaw = form.get('fileName') as string | undefined;
      if (fileNameRaw) {
        fileFromSession = fileNameRaw;
      }
      const maybeFile = form.get('file');
      if (maybeFile && maybeFile instanceof File) {
        const buf = Buffer.from(await maybeFile.arrayBuffer());
        fileParts = [{ mimeType: maybeFile.type || 'application/octet-stream', dataBase64: buf.toString('base64') }];
      }
    } else {
      const body = await request.json();
      tags = body.tags;
      message = body.message;
      history = body.history;
      if (typeof body.file === 'string') {
        fileFromSession = body.file;
      }
    }

    if (!message) {
      return json({ error: 'Message is required' }, { status: 400 });
    }

    // If a session-level file is specified and we have not already attached a file, attach it
    if (!fileParts && fileFromSession) {
      try {
        const absPath = path.join(uploadsDir, fileFromSession);
        const buf = await readFile(absPath);
        const lower = fileFromSession.toLowerCase();
        const mime = lower.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
        fileParts = [{ mimeType: mime, dataBase64: buf.toString('base64') }];
      } catch (e) {
        console.error('Failed to read session file for chat:', fileFromSession, e);
      }
    }

    // Build context from tags (if provided)
    const poolContext = Array.isArray(tags) && tags.length > 0
      ? await buildContextFromTags(tags)
      : '';
    
    // Call LLM with context, history, and new message
    const response = await processWithLLM(poolContext, history || [], message, fileParts);

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