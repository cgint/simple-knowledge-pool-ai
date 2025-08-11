export const GEMINI_API_KEY: string = import.meta.env.GEMINI_API_KEY;
export const AI_RETRY_MAX_ATTEMPTS: number = 1;
export const AI_TIMEOUT_MS: number = 30000;

// LLM Configuration
export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const MAX_CONTEXT_LENGTH = 1000000; // Gemini 2.5 supports up to 1M tokens

// Chat Configuration
export const MAX_HISTORY_MESSAGES: number = 50; // Limit chat history to prevent token overflow