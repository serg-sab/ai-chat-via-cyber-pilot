-- @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1
-- Migration: Create users table
-- Version: 001

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1:inst-create-users-table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    settings JSONB DEFAULT '{"theme": "system", "improveModelOptIn": false}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1:inst-create-users-table

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1:inst-create-users-email-idx
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1:inst-create-users-email-idx

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1:inst-add-status-check
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE users ADD CONSTRAINT check_status CHECK (status IN ('active', 'suspended', 'deleted'));
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1:inst-add-status-check

-- @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1:inst-return-users-created
-- Table users created successfully
-- @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users:p1:inst-return-users-created
