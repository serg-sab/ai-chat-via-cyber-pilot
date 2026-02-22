// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2
// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1
// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-create-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-list-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-get-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-rename-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-delete-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-search-endpoint:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-auto-title:p1

import { getPool } from '../db/pool';
import {
  Conversation,
  Message,
  ConversationPublic,
  ConversationWithMessages,
  MessagePublic,
  PaginatedConversations,
  PaginationParams,
  ConversationError,
} from './types';

const DEFAULT_TITLE = 'New Chat';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toConversationPublic(conv: Conversation): ConversationPublic {
  return {
    id: conv.id,
    title: conv.title,
    messageCount: conv.messageCount,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  };
}

function toMessagePublic(msg: Message): MessagePublic {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  };
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create:p1:inst-submit-create
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create:p1:inst-insert-conversation
export async function createConversation(userId: string, title?: string): Promise<ConversationPublic> {
  const pool = getPool();
  
  const result = await pool.query<Conversation>(
    `INSERT INTO conversations (user_id, title, message_count, created_at, updated_at)
     VALUES ($1, $2, 0, NOW(), NOW())
     RETURNING id, user_id as "userId", title, message_count as "messageCount", 
               created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
    [userId, title || DEFAULT_TITLE]
  );
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create:p1:inst-return-conversation
  return toConversationPublic(result.rows[0]);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create:p1:inst-return-conversation
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create:p1:inst-insert-conversation
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create:p1:inst-submit-create

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-set-defaults
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-cap-limit
function normalizePagination(params: Partial<PaginationParams>): PaginationParams {
  let limit = params.limit ?? DEFAULT_LIMIT;
  const offset = params.offset ?? 0;
  
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }
  if (limit < 1) {
    limit = DEFAULT_LIMIT;
  }
  
  return { limit, offset: Math.max(0, offset) };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-cap-limit
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-set-defaults

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-submit-list
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-parse-pagination
export async function listConversations(
  userId: string,
  params: Partial<PaginationParams> = {}
): Promise<PaginatedConversations> {
  const pool = getPool();
  const { limit, offset } = normalizePagination(params);
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-select-conversations
  const conversationsResult = await pool.query<Conversation>(
    `SELECT id, user_id as "userId", title, message_count as "messageCount",
            created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
     FROM conversations 
     WHERE user_id = $1 AND deleted_at IS NULL 
     ORDER BY updated_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-select-conversations
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-count-conversations
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-exec-count
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM conversations WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-exec-count
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-count-conversations
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-calc-has-more
  const hasMore = (offset + limit) < total;
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-calc-has-more
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-return-list
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-return-paginated
  return {
    conversations: conversationsResult.rows.map(toConversationPublic),
    total,
    limit,
    offset,
    hasMore,
  };
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list:p1:inst-return-paginated
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-return-list
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-parse-pagination
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1:inst-submit-list

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-submit-get
export async function getConversation(
  conversationId: string,
  userId: string
): Promise<ConversationWithMessages> {
  const pool = getPool();
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-select-conversation
  const convResult = await pool.query<Conversation>(
    `SELECT id, user_id as "userId", title, message_count as "messageCount",
            created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
     FROM conversations 
     WHERE id = $1 AND deleted_at IS NULL`,
    [conversationId]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-select-conversation
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-not-found
  if (convResult.rows.length === 0) {
    throw new ConversationError('Conversation not found', 404);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-not-found
  
  const conversation = convResult.rows[0];
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-not-owner
  if (conversation.userId !== userId) {
    throw new ConversationError('Access denied', 403);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-not-owner
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-select-messages
  const messagesResult = await pool.query<Message>(
    `SELECT id, conversation_id as "conversationId", role, content, metadata,
            parent_message_id as "parentMessageId", created_at as "createdAt"
     FROM messages 
     WHERE conversation_id = $1 
     ORDER BY created_at ASC`,
    [conversationId]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-select-messages
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-return-conversation-messages
  return {
    ...toConversationPublic(conversation),
    messages: messagesResult.rows.map(toMessagePublic),
  };
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-return-conversation-messages
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1:inst-submit-get

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-submit-rename
export async function renameConversation(
  conversationId: string,
  userId: string,
  title: string
): Promise<ConversationPublic> {
  const pool = getPool();
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-validate-title
  if (!title || title.trim().length === 0) {
    throw new ConversationError('Title cannot be empty', 400);
  }
  if (title.length > 255) {
    throw new ConversationError('Title cannot exceed 255 characters', 400);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-validate-title
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-select-for-rename
  const convResult = await pool.query<Conversation>(
    `SELECT id, user_id as "userId", title, message_count as "messageCount",
            created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
     FROM conversations 
     WHERE id = $1 AND deleted_at IS NULL`,
    [conversationId]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-select-for-rename
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-not-found-rename
  if (convResult.rows.length === 0) {
    throw new ConversationError('Conversation not found', 404);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-not-found-rename
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-not-owner-rename
  if (convResult.rows[0].userId !== userId) {
    throw new ConversationError('Access denied', 403);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-not-owner-rename
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-update-title
  const updateResult = await pool.query<Conversation>(
    `UPDATE conversations 
     SET title = $1, updated_at = NOW() 
     WHERE id = $2
     RETURNING id, user_id as "userId", title, message_count as "messageCount",
               created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
    [title.trim(), conversationId]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-update-title
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-return-renamed
  return toConversationPublic(updateResult.rows[0]);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-return-renamed
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1:inst-submit-rename

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-submit-delete
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  const pool = getPool();
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-select-for-delete
  const convResult = await pool.query<Conversation>(
    `SELECT id, user_id as "userId" FROM conversations 
     WHERE id = $1 AND deleted_at IS NULL`,
    [conversationId]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-select-for-delete
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-not-found-delete
  if (convResult.rows.length === 0) {
    throw new ConversationError('Conversation not found', 404);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-not-found-delete
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-not-owner-delete
  if (convResult.rows[0].userId !== userId) {
    throw new ConversationError('Access denied', 403);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-not-owner-delete
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-soft-delete
  await pool.query(
    `UPDATE conversations SET deleted_at = NOW() WHERE id = $1`,
    [conversationId]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-soft-delete
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-submit-delete

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2:inst-submit-search
export async function searchConversations(
  userId: string,
  query: string,
  limit: number = DEFAULT_LIMIT
): Promise<ConversationPublic[]> {
  const pool = getPool();
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2:inst-validate-query
  if (!query || query.trim().length === 0) {
    throw new ConversationError('Search query cannot be empty', 400);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2:inst-validate-query
  
  const searchPattern = `%${query.trim()}%`;
  const cappedLimit = Math.min(limit, MAX_LIMIT);
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2:inst-search-query
  const result = await pool.query<Conversation>(
    `SELECT DISTINCT c.id, c.user_id as "userId", c.title, c.message_count as "messageCount",
            c.created_at as "createdAt", c.updated_at as "updatedAt", c.deleted_at as "deletedAt"
     FROM conversations c
     LEFT JOIN messages m ON c.id = m.conversation_id
     WHERE c.user_id = $1 
       AND c.deleted_at IS NULL 
       AND (c.title ILIKE $2 OR m.content ILIKE $2)
     ORDER BY c.updated_at DESC
     LIMIT $3`,
    [userId, searchPattern, cappedLimit]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2:inst-search-query
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2:inst-return-search-results
  return result.rows.map(toConversationPublic);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2:inst-return-search-results
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2:inst-submit-search

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-check-default-title
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-skip-if-renamed
export async function autoGenerateTitle(
  conversationId: string,
  assistantResponse: string
): Promise<string | null> {
  const pool = getPool();
  
  const convResult = await pool.query<{ title: string }>(
    `SELECT title FROM conversations WHERE id = $1`,
    [conversationId]
  );
  
  if (convResult.rows.length === 0) {
    return null;
  }
  
  const currentTitle = convResult.rows[0].title;
  
  if (currentTitle !== DEFAULT_TITLE) {
    return null;
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-skip-if-renamed
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-check-default-title
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-extract-preview
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-clean-title
  let generatedTitle = assistantResponse
    .replace(/[#*`_~\[\]]/g, '')
    .replace(/\n/g, ' ')
    .trim()
    .substring(0, 50);
  
  if (generatedTitle.length === 50) {
    generatedTitle = generatedTitle.substring(0, generatedTitle.lastIndexOf(' ')) || generatedTitle;
    generatedTitle += '...';
  }
  
  if (generatedTitle.length === 0) {
    generatedTitle = 'Chat';
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-clean-title
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-extract-preview
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-update-auto-title
  await pool.query(
    `UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2`,
    [generatedTitle, conversationId]
  );
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-update-auto-title
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-return-auto-title
  return generatedTitle;
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title:p1:inst-return-auto-title
}
