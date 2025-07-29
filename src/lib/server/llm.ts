import type { ChatMessage } from '../types/chat.js';

export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Main LLM interface for sending messages with context
 */
export async function callLLM(
  poolContext: string,
  history: ChatMessage[],
  userMessage: string,
  config?: LLMConfig
): Promise<LLMResponse> {
  // For now, return a mock response
  // In a real implementation, this would integrate with your chosen LLM provider
  
  const contextLength = poolContext.length;
  const fileCount = (poolContext.match(/--- File:/g) || []).length;
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const mockResponse = `I understand you're asking about the ${fileCount} files in this knowledge pool. Based on the context provided (${contextLength} characters), I can help answer questions about the content.

Your message: "${userMessage}"

This is a placeholder response. In a real implementation, I would:
1. Parse the full context from all files in the pool
2. Consider the chat history for continuity
3. Send a properly formatted prompt to your chosen LLM provider (Google Gemini, OpenAI, Anthropic, etc.)
4. Return the AI's actual response

The context includes the following files and I'm ready to answer questions about them based on their content.`;

  return {
    content: mockResponse,
    usage: {
      promptTokens: Math.floor(contextLength / 4) + userMessage.length,
      completionTokens: mockResponse.length,
      totalTokens: Math.floor(contextLength / 4) + userMessage.length + mockResponse.length
    }
  };
}

/**
 * Format the context and history for LLM consumption
 */
export function formatPrompt(
  poolContext: string,
  history: ChatMessage[],
  userMessage: string
): string {
  let prompt = `You are an AI assistant helping users understand and analyze documents in a knowledge pool. You have access to the following context:

KNOWLEDGE POOL CONTEXT:
${poolContext}

CHAT HISTORY:
`;

  if (history.length > 0) {
    for (const message of history) {
      prompt += `${message.role.toUpperCase()}: ${message.content}\n`;
    }
  } else {
    prompt += 'No previous messages in this conversation.\n';
  }

  prompt += `
CURRENT USER MESSAGE: ${userMessage}

Please provide a helpful, accurate response based on the context provided. If the question cannot be answered from the available documents, please say so clearly.`;

  return prompt;
}

/**
 * Configuration for different LLM providers
 */
export const LLM_CONFIGS = {
  gemini: {
    model: 'gemini-1.5-flash',
    maxTokens: 8192
  },
  openai: {
    model: 'gpt-4',
    maxTokens: 4096
  },
  anthropic: {
    model: 'claude-3-sonnet-20240229',
    maxTokens: 4096
  }
} as const;

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
} 