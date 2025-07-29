import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';
import { callLLM } from '$lib/server/llm.js';
import type { Pool, ChatMessage, ChatRequest } from '$lib/types/chat.js';

const poolsFilePath = path.join(process.cwd(), 'data', 'pools.json');
const uploadsDir = path.join(process.cwd(), 'data', 'uploads');

async function getPools(): Promise<Pool[]> {
  try {
    const data = await readFile(poolsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function getFileContent(filename: string): Promise<string> {
  try {
    const filePath = path.join(uploadsDir, filename);
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read file ${filename}:`, error);
    return `[Error reading file: ${filename}]`;
  }
}

async function getPoolContext(poolId: string): Promise<string> {
  const pools = await getPools();
  const pool = pools.find(p => p.id === poolId);
  
  if (!pool) {
    throw new Error('Pool not found');
  }

  const fileContents = await Promise.all(
    pool.files.map(async (filename) => {
      const content = await getFileContent(filename);
      return `--- File: ${filename} ---\n${content}\n`;
    })
  );

  return fileContents.join('\n');
}

async function processWithLLM(poolContext: string, history: ChatMessage[], userMessage: string): Promise<string> {
  const response = await callLLM(poolContext, history, userMessage);
  return response.content;
}

export async function POST({ request }: RequestEvent) {
  try {
    const { poolId, message, history }: ChatRequest = await request.json();

    if (!poolId || !message) {
      return json({ error: 'Pool ID and message are required' }, { status: 400 });
    }

    // Get pool context (all file contents)
    const poolContext = await getPoolContext(poolId);
    
    // Call LLM with context, history, and new message
    const response = await processWithLLM(poolContext, history || [], message);

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