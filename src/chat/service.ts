// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-send-message-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-stop-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-regenerate-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-message-persistence:p1

import { Response } from 'express';
import { getPool } from '../db/pool';
import { getRedis } from '../db/redis';
import { buildContext, countTokens } from './context';
import { streamCompletion } from './llm';
import { enforceRateLimit, setRateLimitHeaders } from './rateLimit';
import { autoGenerateTitle } from '../conversations/service';
import { ChatError, MessageMetadata, DoneEventData } from './types';

const ABORT_KEY_PREFIX = 'chat:abort:';

// Active generation contexts (in-memory for single instance)
const activeGenerations = new Map<string, AbortController>();

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-set-sse-headers
function setupSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-set-sse-headers

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-send-sse-token
function sendSSEToken(res: Response, content: string): void {
  res.write(`event: token\ndata: ${JSON.stringify({ content })}\n\n`);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-send-sse-token

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-send-sse-done
function sendSSEDone(res: Response, data: DoneEventData): void {
  res.write(`event: done\ndata: ${JSON.stringify(data)}\n\n`);
  res.end();
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-send-sse-done

function sendSSEError(res: Response, error: string, code: string): void {
  res.write(`event: error\ndata: ${JSON.stringify({ error, code })}\n\n`);
  res.end();
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-validate-auth-owner
async function validateConversationOwnership(
  conversationId: string,
  userId: string
): Promise<void> {
  const pool = getPool();
  
  const result = await pool.query(
    `SELECT user_id FROM conversations WHERE id = $1 AND deleted_at IS NULL`,
    [conversationId]
  );
  
  if (result.rows.length === 0) {
    throw new ChatError('Conversation not found', 404, 'NOT_FOUND');
  }
  
  if (result.rows[0].user_id !== userId) {
    throw new ChatError('Access denied', 403, 'FORBIDDEN');
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-validate-auth-owner

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-save-user-message
async function saveUserMessage(
  conversationId: string,
  content: string
): Promise<string> {
  const pool = getPool();
  
  const result = await pool.query<{ id: string }>(
    `INSERT INTO messages (conversation_id, role, content, metadata, created_at)
     VALUES ($1, 'user', $2, '{}'::jsonb, NOW())
     RETURNING id`,
    [conversationId, content]
  );
  
  return result.rows[0].id;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-save-user-message

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-save-assistant-message
async function saveAssistantMessage(
  conversationId: string,
  content: string,
  metadata: MessageMetadata
): Promise<string> {
  const pool = getPool();
  
  const result = await pool.query<{ id: string }>(
    `INSERT INTO messages (conversation_id, role, content, metadata, created_at)
     VALUES ($1, 'assistant', $2, $3::jsonb, NOW())
     RETURNING id`,
    [conversationId, content, JSON.stringify(metadata)]
  );
  
  return result.rows[0].id;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-save-assistant-message

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-update-conversation
async function updateConversationCount(conversationId: string, delta: number): Promise<void> {
  const pool = getPool();
  
  await pool.query(
    `UPDATE conversations 
     SET message_count = message_count + $1, updated_at = NOW() 
     WHERE id = $2`,
    [delta, conversationId]
  );
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-update-conversation

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-submit-message
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-check-rate-limit
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-build-context
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-stream-llm
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-token-loop
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-accumulate-token
export async function sendMessage(
  conversationId: string,
  userId: string,
  ip: string,
  content: string,
  res: Response
): Promise<void> {
  const startTime = Date.now();
  
  // Validate ownership
  await validateConversationOwnership(conversationId, userId);
  
  // Check rate limit
  const rateLimitResult = await enforceRateLimit(userId, ip);
  setRateLimitHeaders(res, rateLimitResult);
  
  // Save user message
  await saveUserMessage(conversationId, content);
  await updateConversationCount(conversationId, 1);
  
  // Build context
  const context = await buildContext(conversationId);
  
  // Add current user message to context
  context.push({ role: 'user', content });
  
  // Setup SSE
  setupSSE(res);
  
  // Create abort controller
  const abortController = new AbortController();
  activeGenerations.set(conversationId, abortController);
  
  // Store abort flag in Redis for distributed systems
  const redis = getRedis();
  await redis.del(`${ABORT_KEY_PREFIX}${conversationId}`);
  
  let responseContent = '';
  let tokenCount = 0;
  
  try {
    // Stream LLM response
    const stream = streamCompletion(context, {
      abortSignal: abortController.signal,
    });
    
    for await (const token of stream) {
      // Check abort flag
      const aborted = await redis.get(`${ABORT_KEY_PREFIX}${conversationId}`);
      if (aborted || abortController.signal.aborted) {
        break;
      }
      
      responseContent += token;
      tokenCount++;
      sendSSEToken(res, token);
    }
    
    const latencyMs = Date.now() - startTime;
    
    // Save assistant message
    const metadata: MessageMetadata = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tokenCount: countTokens(responseContent),
      latencyMs,
    };
    
    const messageId = await saveAssistantMessage(conversationId, responseContent, metadata);
    await updateConversationCount(conversationId, 1);
    
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-auto-title
    // Auto-generate title if first response
    await autoGenerateTitle(conversationId, responseContent);
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-auto-title
    
    // Send done event
    sendSSEDone(res, {
      messageId,
      tokenCount: metadata.tokenCount,
      latencyMs,
    });
  } catch (err) {
    if (err instanceof ChatError) {
      sendSSEError(res, err.message, err.code);
    } else {
      console.error('Send message error:', err);
      sendSSEError(res, 'Failed to generate response', 'INTERNAL_ERROR');
    }
  } finally {
    activeGenerations.delete(conversationId);
    await redis.del(`${ABORT_KEY_PREFIX}${conversationId}`);
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-accumulate-token
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-token-loop
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-stream-llm
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-build-context
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-check-rate-limit
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-submit-message

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1:inst-submit-stop
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1:inst-validate-auth-stop
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1:inst-set-abort-flag
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1:inst-return-stop-ack
export async function stopGeneration(
  conversationId: string,
  userId: string
): Promise<void> {
  // Validate ownership
  await validateConversationOwnership(conversationId, userId);
  
  // Set abort flag in Redis
  const redis = getRedis();
  await redis.setex(`${ABORT_KEY_PREFIX}${conversationId}`, 60, '1');
  
  // Abort local controller if exists
  const controller = activeGenerations.get(conversationId);
  if (controller) {
    controller.abort();
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1:inst-return-stop-ack
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1:inst-set-abort-flag
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1:inst-validate-auth-stop
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1:inst-submit-stop

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-submit-regenerate
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-validate-auth-regen
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-find-last-assistant
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-no-message-to-regen
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-delete-last-assistant
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-decrement-count
export async function regenerateResponse(
  conversationId: string,
  userId: string,
  ip: string,
  res: Response
): Promise<void> {
  const pool = getPool();
  const startTime = Date.now();
  
  // Validate ownership
  await validateConversationOwnership(conversationId, userId);
  
  // Check rate limit
  const rateLimitResult = await enforceRateLimit(userId, ip);
  setRateLimitHeaders(res, rateLimitResult);
  
  // Find last assistant message
  const lastAssistant = await pool.query<{ id: string }>(
    `SELECT id FROM messages 
     WHERE conversation_id = $1 AND role = 'assistant'
     ORDER BY created_at DESC LIMIT 1`,
    [conversationId]
  );
  
  if (lastAssistant.rows.length === 0) {
    throw new ChatError('No assistant message to regenerate', 400, 'NO_MESSAGE');
  }
  
  // Delete last assistant message
  await pool.query(
    `DELETE FROM messages WHERE id = $1`,
    [lastAssistant.rows[0].id]
  );
  await updateConversationCount(conversationId, -1);
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-build-context-regen
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-stream-llm-regen
  // Build context (now without the deleted message)
  const context = await buildContext(conversationId);
  
  // Setup SSE
  setupSSE(res);
  
  // Create abort controller
  const abortController = new AbortController();
  activeGenerations.set(conversationId, abortController);
  
  const redis = getRedis();
  await redis.del(`${ABORT_KEY_PREFIX}${conversationId}`);
  
  let responseContent = '';
  
  try {
    const stream = streamCompletion(context, {
      abortSignal: abortController.signal,
    });
    
    for await (const token of stream) {
      const aborted = await redis.get(`${ABORT_KEY_PREFIX}${conversationId}`);
      if (aborted || abortController.signal.aborted) {
        break;
      }
      
      responseContent += token;
      sendSSEToken(res, token);
    }
    
    const latencyMs = Date.now() - startTime;
    
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-save-regen-message
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-update-conversation-regen
    const metadata: MessageMetadata = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tokenCount: countTokens(responseContent),
      latencyMs,
    };
    
    const messageId = await saveAssistantMessage(conversationId, responseContent, metadata);
    await updateConversationCount(conversationId, 1);
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-update-conversation-regen
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-save-regen-message
    
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-send-sse-done-regen
    sendSSEDone(res, {
      messageId,
      tokenCount: metadata.tokenCount,
      latencyMs,
    });
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-send-sse-done-regen
  } catch (err) {
    if (err instanceof ChatError) {
      sendSSEError(res, err.message, err.code);
    } else {
      console.error('Regenerate error:', err);
      sendSSEError(res, 'Failed to regenerate response', 'INTERNAL_ERROR');
    }
  } finally {
    activeGenerations.delete(conversationId);
    await redis.del(`${ABORT_KEY_PREFIX}${conversationId}`);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-stream-llm-regen
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-build-context-regen
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-decrement-count
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-delete-last-assistant
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-no-message-to-regen
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-find-last-assistant
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-validate-auth-regen
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1:inst-submit-regenerate
