import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveFilesFromTags, normalizeFileList } from '$lib/server/fileResolver.js';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatSession {
  id: string;
  tags: string[];
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  files: string[]; // Explicitly store resolved files
}

const chatHistoryDir = path.join(process.cwd(), 'data', 'chat-history');

async function ensureChatHistoryDir() {
  try {
    await mkdir(chatHistoryDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

async function saveChatSession(session: ChatSession): Promise<void> {
  await ensureChatHistoryDir();
  const filePath = path.join(chatHistoryDir, `${session.id}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2));
}

export const load: PageServerLoad = async ({ url }) => {
  // Parse query parameters
  const tagsParam = url.searchParams.get('tags');
  const filesParam = url.searchParams.get('files');
  const titleParam = url.searchParams.get('title');

  let tags: string[] = [];
  let files: string[] = [];

  // Parse tags parameter
  if (tagsParam) {
    try {
      const parsed = JSON.parse(tagsParam);
      if (Array.isArray(parsed)) {
        tags = parsed.filter((t): t is string => typeof t === 'string');
      }
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      tags = tagsParam.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
  }

  // Parse files parameter
  if (filesParam) {
    try {
      const parsed = JSON.parse(filesParam);
      files = normalizeFileList(parsed);
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      files = normalizeFileList(filesParam.split(',').map(f => f.trim()));
    }
  }

  // Resolve files from tags and combine with explicit files
  const resolvedFiles = new Set<string>();
  
  if (tags.length > 0) {
    const fromTags = await resolveFilesFromTags(tags);
    for (const file of fromTags) {
      resolvedFiles.add(file);
    }
  }
  
  for (const file of files) {
    resolvedFiles.add(file);
  }

  // Create chat session
  const session: ChatSession = {
    id: uuidv4(),
    tags,
    title: titleParam || (tags.length > 0 ? `Chat about: ${tags.join(', ')}` : 'New Chat'),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    files: Array.from(resolvedFiles)
  };

  // Save session
  await saveChatSession(session);

  // Redirect to chat page
  throw redirect(302, `/chat/${session.id}`);
};
