export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  poolId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface Pool {
  id: string;
  name: string;
  files: string[];
}

export interface ChatRequest {
  poolId: string;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  timestamp: number;
} 