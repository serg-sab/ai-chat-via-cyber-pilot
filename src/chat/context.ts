// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1
// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-context-management:p1

import { getPool } from '../db/pool';
import { ChatMessage } from './types';

const DEFAULT_SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || 
  'You are a helpful AI assistant. Be concise and accurate in your responses. Format code blocks with appropriate language tags for syntax highlighting.';

const CONTEXT_MAX_TOKENS = parseInt(process.env.CONTEXT_MAX_TOKENS || '8000', 10);

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens:p1:inst-get-encoding
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens:p1:inst-encode-text
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens:p1:inst-return-count
export function countTokens(text: string): number {
  // Approximate token count: ~4 characters per token for English text
  // In production, use tiktoken for accurate counting
  // This approximation is sufficient for MVP and avoids native dependency issues
  return Math.ceil(text.length / 4);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens:p1:inst-return-count
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens:p1:inst-encode-text
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens:p1:inst-get-encoding

export function countMessageTokens(message: ChatMessage): number {
  // Add overhead for message structure (~4 tokens per message)
  return countTokens(message.content) + 4;
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-load-system-prompt
function getSystemPrompt(): ChatMessage {
  return {
    role: 'system',
    content: DEFAULT_SYSTEM_PROMPT,
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-load-system-prompt

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-load-messages
async function loadConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const pool = getPool();
  
  const result = await pool.query<{ role: string; content: string }>(
    `SELECT role, content FROM messages 
     WHERE conversation_id = $1 
     ORDER BY created_at ASC`,
    [conversationId]
  );
  
  return result.rows.map(row => ({
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content,
  }));
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-load-messages

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-count-message-tokens
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-calc-total-tokens
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-truncation-loop
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-remove-oldest
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-recalc-tokens
function truncateContext(
  messages: ChatMessage[],
  systemPrompt: ChatMessage,
  maxTokens: number
): ChatMessage[] {
  const systemTokens = countMessageTokens(systemPrompt);
  let availableTokens = maxTokens - systemTokens;
  
  // Calculate tokens for all messages
  const messageTokens = messages.map(msg => ({
    message: msg,
    tokens: countMessageTokens(msg),
  }));
  
  // Calculate total tokens
  let totalTokens = messageTokens.reduce((sum, m) => sum + m.tokens, 0);
  
  // Remove oldest messages until we fit
  const truncatedMessages = [...messageTokens];
  while (totalTokens > availableTokens && truncatedMessages.length > 0) {
    const removed = truncatedMessages.shift();
    if (removed) {
      totalTokens -= removed.tokens;
    }
  }
  
  return truncatedMessages.map(m => m.message);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-recalc-tokens
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-remove-oldest
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-truncation-loop
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-calc-total-tokens
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-count-message-tokens

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-build-array
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-return-context
export async function buildContext(
  conversationId: string,
  maxTokens: number = CONTEXT_MAX_TOKENS
): Promise<ChatMessage[]> {
  const systemPrompt = getSystemPrompt();
  const messages = await loadConversationMessages(conversationId);
  
  const truncatedMessages = truncateContext(messages, systemPrompt, maxTokens);
  
  return [systemPrompt, ...truncatedMessages];
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-return-context
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context:p1:inst-build-array

export { CONTEXT_MAX_TOKENS, DEFAULT_SYSTEM_PROMPT };
