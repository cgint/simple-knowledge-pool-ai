import type { ChatMessage } from '../types/chat.js';
import { 
  GEMINI_API_KEY, 
  AI_RETRY_MAX_ATTEMPTS, 
  AI_TIMEOUT_MS, 
  DEFAULT_MODEL,
  MAX_CONTEXT_LENGTH,
  MAX_HISTORY_MESSAGES 
} from '../constants.js';

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

export interface InlineFilePart {
  mimeType: string;
  dataBase64?: string;
  fileUri?: string;
}

/**
 * Main LLM interface for sending messages with context
 */
export async function callLLM(
  poolContext: string,
  history: ChatMessage[],
  userMessage: string,
  config?: LLMConfig,
  fileParts?: InlineFilePart[]
): Promise<LLMResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const model = config?.model || DEFAULT_MODEL;
  const limitedHistory = history.slice(-MAX_HISTORY_MESSAGES);

  return await makeGeminiCall(model, poolContext, limitedHistory, userMessage, fileParts);
}

/**
 * Make direct API call to Gemini with context
 */
async function makeGeminiCall(
  model: string,
  poolContext: string,
  history: ChatMessage[],
  userMessage: string,
  fileParts?: InlineFilePart[]
): Promise<LLMResponse> {
  const modelEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  // Build conversation contents with history
  const contents = [];
  
  // Add conversation history
  for (const message of history) {
    contents.push({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }]
    });
  }
  
  // Build the prompt with context
  const prompt = formatPrompt(poolContext, userMessage);
  
  // Add current user message
  const parts: any[] = [{ text: prompt }];
  if (Array.isArray(fileParts) && fileParts.length > 0) {
    for (const fp of fileParts) {
      if (!fp) continue;
      if (fp.fileUri) {
        parts.push({ fileData: { fileUri: fp.fileUri, mimeType: fp.mimeType || 'application/octet-stream' } });
      } else if (fp.dataBase64) {
        parts.push({ inlineData: { mimeType: fp.mimeType || 'application/octet-stream', data: fp.dataBase64 } });
      }
    }
  }
  contents.push({ role: 'user', parts });


  const disabledThinking = { thinkingBudget: 0 }

  const requestBody = {
    contents: contents,
    generationConfig: {
      temperature: 0.3,
      // maxOutputTokens: 8192,
      thinkingConfig: disabledThinking
    },
  };

  return await makeCallWithRetry(modelEndpoint, requestBody);
}

/**
 * Make API call with retry logic
 */
async function makeCallWithRetry(endpoint: string, requestBody: any): Promise<LLMResponse> {
  let attempts = 0;
  
  while (attempts < AI_RETRY_MAX_ATTEMPTS) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), AI_TIMEOUT_MS)
      );

      console.log('endpoint', endpoint.slice(0, -20));
      const stringifiedBody = JSON.stringify(requestBody);
      console.log('stringifiedBody length: ', stringifiedBody.length);

      const apiCall = fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: stringifiedBody,
      });

      const response = await Promise.race([apiCall, timeoutPromise]);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let rawBody = '';
        try {
          rawBody = await (response as Response).text();
        } catch {
          // ignore
        }
        let parsed: any | null = null;
        try {
          parsed = rawBody ? JSON.parse(rawBody) : null;
        } catch {
          // ignore JSON parse errors; keep raw body
        }
        const googleError = parsed?.error ?? parsed ?? {};
        const extractedStatus = typeof googleError?.status === 'string' ? googleError.status : '';
        const extractedMessage = typeof googleError?.message === 'string' ? googleError.message : '';
        const details = Array.isArray(googleError?.details) ? googleError.details : undefined;
        const detailHint = details ? JSON.stringify(details).slice(0, 1000) : undefined;
        const redactedEndpoint = endpoint.replace(/key=[^&]+/g, 'key=***');
        const bodyPreview = `${extractedStatus ? extractedStatus + ' ' : ''}${extractedMessage || rawBody}`.slice(0, 2000);

        console.error('Gemini API error', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          endpoint: redactedEndpoint,
          message: bodyPreview,
          details: detailHint
        });

        throw new Error(`Gemini API error: ${response.status} ${response.statusText}: ${bodyPreview}`);
      }
      
      const result = await response.json();
      
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        throw new Error('Invalid response format from Gemini API');
      }
      
      const content = result.candidates[0].content.parts[0].text;
      
      // Estimate token usage
      const promptTokens = estimateTokens(JSON.stringify(requestBody));
      const completionTokens = estimateTokens(content);
      
      return {
        content,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens
        }
      };
      
    } catch (error) {
      attempts++;
      console.error(`LLM API attempt ${attempts}/${AI_RETRY_MAX_ATTEMPTS} failed:`, error);
      
      if (attempts >= AI_RETRY_MAX_ATTEMPTS) {
        throw new Error(`Failed to get LLM response after ${AI_RETRY_MAX_ATTEMPTS} attempts: ${error}`);
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Unexpected error in retry logic');
}

/**
 * Format the prompt with file context and user message
 */
function formatPrompt(poolContext: string, userMessage: string): string {
  let prompt = `You are an AI assistant helping users understand and analyze documents in a knowledge pool.

=== KNOWLEDGE POOL DOCUMENTS ===
${poolContext}

=== CURRENT QUESTION ===
${userMessage}

=== INSTRUCTIONS ===
Please provide a helpful, accurate, and detailed response based on the documents provided above. Here are your guidelines:

1. **Multi-modal Analysis**: You can read and analyze PDFs, images, and text files directly
2. **Reference Sources**: When referencing information, mention which document it comes from
3. **Comprehensive Understanding**: Use information from all provided documents to give complete answers
4. **Admit Limitations**: If something can't be answered from the available documents, clearly state this
5. **Maintain Context**: Consider our conversation history for context
6. **Document Overview**: If asked about available documents, describe what you have access to

For PDFs and images: You can read text, analyze charts, tables, diagrams, and extract any relevant information.
For text files: The content is provided directly in this prompt.`;

  return prompt;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
} 