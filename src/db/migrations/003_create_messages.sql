-- @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1
-- Migration: Create messages table
-- Version: 003

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-create-messages-table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    parent_message_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-create-messages-table

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-add-role-check
ALTER TABLE messages DROP CONSTRAINT IF EXISTS check_role;
ALTER TABLE messages ADD CONSTRAINT check_role CHECK (role IN ('user', 'assistant', 'system'));
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-add-role-check

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-create-msg-conv-idx
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-create-msg-conv-idx

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-create-msg-created-idx
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-create-msg-created-idx

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-return-messages-created
-- Table messages created successfully
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages:p1:inst-return-messages-created
