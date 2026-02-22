// Conversation module type definitions
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-create-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-list-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-get-endpoint:p1

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: MessageMetadata;
  parentMessageId: string | null;
  createdAt: Date;
}

export interface MessageMetadata {
  model?: string;
  tokenCount?: number;
  latencyMs?: number;
  safetyFlags?: string[];
}

export interface ConversationPublic {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationWithMessages extends ConversationPublic {
  messages: MessagePublic[];
}

export interface MessagePublic {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface PaginatedConversations {
  conversations: ConversationPublic[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface CreateConversationInput {
  title?: string;
}

export interface RenameConversationInput {
  title: string;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export class ConversationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}
