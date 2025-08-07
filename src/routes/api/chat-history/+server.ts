import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const chatHistoryDir = path.join(process.cwd(), 'data', 'chat-history');

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
}

async function ensureChatHistoryDir() {
  try {
    await mkdir(chatHistoryDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const filePath = path.join(chatHistoryDir, `${sessionId}.json`);
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function saveChatSession(session: ChatSession): Promise<void> {
  await ensureChatHistoryDir();
  const filePath = path.join(chatHistoryDir, `${session.id}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2));
}

async function getAllChatSessions(filterTags?: string[]): Promise<ChatSession[]> {
  try {
    await ensureChatHistoryDir();
    const { readdir } = await import('fs/promises');
    const files = await readdir(chatHistoryDir);
    
    const sessions = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          try {
            const sessionId = file.replace('.json', '');
            return await getChatSession(sessionId);
          } catch {
            return null;
          }
        })
    );

    const validSessions = sessions.filter((session): session is ChatSession => session !== null);
    if (filterTags && filterTags.length > 0) {
      return validSessions.filter(session => Array.isArray(session.tags) && filterTags.every(t => session.tags.includes(t)));
    }
    
    return validSessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    return [];
  }
}

// GET /api/chat-history?tags=["tag1","tag2"] - Get all chat sessions filtered by tags
export async function GET({ url }: RequestEvent) {
  const tagsParam = url.searchParams.get('tags');
  let tags: string[] | undefined = undefined;
  if (tagsParam) {
    try { const parsed = JSON.parse(tagsParam); if (Array.isArray(parsed)) tags = parsed as string[]; } catch {}
  }
  const sessions = await getAllChatSessions(tags || undefined);
  return json(sessions);
}

// POST /api/chat-history - Create new chat session
export async function POST({ request }: RequestEvent) {
  try {
    const { tags, title } = await request.json();
    const session: ChatSession = {
      id: uuidv4(),
      tags: Array.isArray(tags) ? tags : [],
      title: title || 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await saveChatSession(session);
    return json(session, { status: 201 });
  } catch (error) {
    console.error('Failed to create chat session:', error);
    return json({ error: 'Failed to create chat session' }, { status: 500 });
  }
}

// PUT /api/chat-history - Update existing chat session
export async function PUT({ request }: RequestEvent) {
  try {
    const updatedSession: ChatSession = await request.json();

    if (!updatedSession.id) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    updatedSession.updatedAt = Date.now();
    await saveChatSession(updatedSession);
    return json(updatedSession);
  } catch (error) {
    console.error('Failed to update chat session:', error);
    return json({ error: 'Failed to update chat session' }, { status: 500 });
  }
} 