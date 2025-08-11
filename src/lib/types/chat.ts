export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  tags: string[];
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  file?: string;
}

export interface ChatRequest {
  tags: string[];
  message: string;
  history: ChatMessage[];
  file?: string;
}

export interface ChatResponse {
  response: string;
  timestamp: number;
} 