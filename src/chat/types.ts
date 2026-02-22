// Chat module type definitions
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-send-message-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-context-management:p1

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MessageMetadata {
  model: string;
  tokenCount: number;
  latencyMs: number;
  safetyFlags?: string[];
}

export interface SendMessageInput {
  content: string;
}

export interface SSEEvent {
  event: 'token' | 'done' | 'error';
  data: TokenEventData | DoneEventData | ErrorEventData;
}

export interface TokenEventData {
  content: string;
}

export interface DoneEventData {
  messageId: string;
  tokenCount: number;
  latencyMs: number;
}

export interface ErrorEventData {
  error: string;
  code: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export interface GenerationContext {
  conversationId: string;
  userId: string;
  abortController: AbortController;
}

export class ChatError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'CHAT_ERROR'
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

export class RateLimitError extends ChatError {
  constructor(
    public retryAfter: number
  ) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class LLMError extends ChatError {
  constructor(message: string) {
    super(message, 502, 'LLM_ERROR');
  }
}
