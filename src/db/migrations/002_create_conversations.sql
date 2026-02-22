-- @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1
-- Migration: Create conversations table
-- Version: 002

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1:inst-create-conversations-table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1:inst-create-conversations-table

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1:inst-create-conv-user-idx
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1:inst-create-conv-user-idx

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1:inst-create-conv-updated-idx
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1:inst-create-conv-updated-idx

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1:inst-return-conversations-created
-- Table conversations created successfully
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations:p1:inst-return-conversations-created
