// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-llm-adapter:p1

import OpenAI from 'openai';
import { ChatMessage, LLMError } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10);

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-init-openai
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!OPENAI_API_KEY) {
      throw new LLMError('OpenAI API key not configured');
    }
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }
  return openaiClient;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-init-openai

export interface StreamOptions {
  model?: string;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-create-request
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-try-stream
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-chunk-loop
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-check-abort
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-extract-token
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-yield-token
export async function* streamCompletion(
  messages: ChatMessage[],
  options: StreamOptions = {}
): AsyncGenerator<string, void, unknown> {
  const client = getOpenAIClient();
  const model = options.model || OPENAI_MODEL;
  const maxTokens = options.maxTokens || OPENAI_MAX_TOKENS;
  
  try {
    const stream = await client.chat.completions.create({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: maxTokens,
      stream: true,
    });
    
    for await (const chunk of stream) {
      // Check abort signal
      if (options.abortSignal?.aborted) {
        break;
      }
      
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-yield-token
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-extract-token
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-check-abort
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-chunk-loop
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-try-stream
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-create-request
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-catch-error
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-handle-rate-limit
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-handle-timeout
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-handle-generic-error
  } catch (err: unknown) {
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429) {
        throw new LLMError('LLM rate limit exceeded. Please try again later.');
      }
      if (err.status === 408 || err.code === 'ETIMEDOUT') {
        throw new LLMError('LLM request timed out. Please try again.');
      }
      console.error('OpenAI API error:', err.message);
      throw new LLMError('AI service temporarily unavailable. Please try again.');
    }
    
    console.error('LLM streaming error:', err);
    throw new LLMError('Failed to generate response. Please try again.');
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-handle-generic-error
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-handle-timeout
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-handle-rate-limit
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm:p1:inst-catch-error
}

export { OPENAI_MODEL, OPENAI_MAX_TOKENS };
