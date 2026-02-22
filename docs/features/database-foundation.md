# Feature: Database Foundation

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-featstatus-database-foundation`

## 1. Feature Context

- [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-feature-database-foundation`

### 1.1 Overview

Establish the foundational database schema and infrastructure required by all other features. This includes PostgreSQL setup, Redis configuration, and core table definitions for users, conversations, and messages.

### 1.2 Purpose

This feature provides the data persistence layer that all other features depend on. Without the database foundation, no user data, conversations, or messages can be stored or retrieved.

**Problem**: The application needs persistent storage for user accounts, chat conversations, and messages with proper relational integrity.

**Primary value**: Enables all data persistence operations with ACID guarantees and efficient querying.

**Key assumptions**: PostgreSQL 15+ and Redis 7+ are available in the deployment environment.

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-ai-chat-via-cyber-pilot-actor-admin` | Executes database setup and migrations |

### 1.4 References

- **PRD**: [PRD.md](../PRD.md)
- **Design**: [DESIGN.md](../DESIGN.md)
- **Dependencies**: None (foundation feature)

## 2. Actor Flows (CDSL)

### Database Setup Flow

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-database-foundation-setup`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

**Success Scenarios**:
- All database infrastructure is provisioned and accessible
- All tables are created with proper constraints and indexes
- Connection pooling is configured and tested

**Error Scenarios**:
- PostgreSQL connection fails — verify credentials and network
- Redis connection fails — verify Redis is running
- Migration fails — rollback and check SQL syntax

**Steps**:
1. [ ] - `p1` - Admin provisions PostgreSQL database instance - `inst-provision-pg`
2. [ ] - `p1` - Admin provisions Redis instance - `inst-provision-redis`
3. [ ] - `p1` - Admin configures database connection string in environment - `inst-config-env`
4. [ ] - `p1` - Admin runs migration tool to apply schema - `inst-run-migrations`
5. [ ] - `p1` - Algorithm: execute migrations using `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations` - `inst-exec-migrations`
6. [ ] - `p1` - Admin verifies tables exist with correct structure - `inst-verify-tables`
7. [ ] - `p1` - Admin configures connection pool settings - `inst-config-pool`
8. [ ] - `p1` - Admin tests database connectivity from application - `inst-test-connectivity`
9. [ ] - `p1` - **RETURN** database ready for application use - `inst-return-ready`

## 3. Processes / Business Logic (CDSL)

### Run Migrations

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations`

**Input**: Migration directory path, database connection string

**Output**: Migration result (success/failure, applied migrations list)

**Steps**:
1. [ ] - `p1` - Connect to PostgreSQL using connection string - `inst-connect-db`
2. [ ] - `p1` - DB: SELECT FROM migrations table to get applied migrations - `inst-get-applied`
3. [ ] - `p1` - Read migration files from directory, sort by version - `inst-read-files`
4. [ ] - `p1` - **FOR EACH** migration in pending_migrations - `inst-loop-migrations`
   1. [ ] - `p1` - **TRY** - `inst-try-migration`
      1. [ ] - `p1` - Begin transaction - `inst-begin-tx`
      2. [ ] - `p1` - Execute migration SQL - `inst-exec-sql`
      3. [ ] - `p1` - DB: INSERT INTO migrations(version, applied_at) - `inst-record-migration`
      4. [ ] - `p1` - Commit transaction - `inst-commit-tx`
   2. [ ] - `p1` - **CATCH** error - `inst-catch-error`
      1. [ ] - `p1` - Rollback transaction - `inst-rollback-tx`
      2. [ ] - `p1` - **RETURN** error with migration version and details - `inst-return-error`
5. [ ] - `p1` - **RETURN** success with list of applied migrations - `inst-return-success`

### Create Users Table

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users`

**Input**: None (DDL migration)

**Output**: users table created

**Steps**:
1. [ ] - `p1` - DB: CREATE TABLE users with columns (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE, password_hash VARCHAR(255), oauth_provider VARCHAR(50), oauth_id VARCHAR(255), settings JSONB, status VARCHAR(20), created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ) - `inst-create-users-table`
2. [ ] - `p1` - DB: CREATE INDEX idx_users_email ON users(email) - `inst-create-users-email-idx`
3. [ ] - `p1` - DB: ADD CONSTRAINT check_status CHECK (status IN ('active', 'suspended', 'deleted')) - `inst-add-status-check`
4. [ ] - `p1` - **RETURN** table created - `inst-return-users-created`

### Create Conversations Table

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations`

**Input**: None (DDL migration)

**Output**: conversations table created

**Steps**:
1. [ ] - `p1` - DB: CREATE TABLE conversations with columns (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255), message_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ) - `inst-create-conversations-table`
2. [ ] - `p1` - DB: CREATE INDEX idx_conversations_user_id ON conversations(user_id) - `inst-create-conv-user-idx`
3. [ ] - `p1` - DB: CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC) - `inst-create-conv-updated-idx`
4. [ ] - `p1` - **RETURN** table created - `inst-return-conversations-created`

### Create Messages Table

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages`

**Input**: None (DDL migration)

**Output**: messages table created

**Steps**:
1. [ ] - `p1` - DB: CREATE TABLE messages with columns (id UUID PRIMARY KEY, conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE, role VARCHAR(20), content TEXT, metadata JSONB, parent_message_id UUID, created_at TIMESTAMPTZ) - `inst-create-messages-table`
2. [ ] - `p1` - DB: ADD CONSTRAINT check_role CHECK (role IN ('user', 'assistant', 'system')) - `inst-add-role-check`
3. [ ] - `p1` - DB: CREATE INDEX idx_messages_conversation_id ON messages(conversation_id) - `inst-create-msg-conv-idx`
4. [ ] - `p1` - DB: CREATE INDEX idx_messages_created_at ON messages(created_at) - `inst-create-msg-created-idx`
5. [ ] - `p1` - **RETURN** table created - `inst-return-messages-created`

### Configure Connection Pool

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool`

**Input**: Pool configuration (min, max, idle timeout)

**Output**: Connection pool configured

**Steps**:
1. [ ] - `p2` - Set minimum pool size (default: 2) - `inst-set-min-pool`
2. [ ] - `p2` - Set maximum pool size (default: 10) - `inst-set-max-pool`
3. [ ] - `p2` - Set idle timeout (default: 30000ms) - `inst-set-idle-timeout`
4. [ ] - `p2` - Set connection timeout (default: 5000ms) - `inst-set-conn-timeout`
5. [ ] - `p2` - Initialize pool with settings - `inst-init-pool`
6. [ ] - `p2` - Test pool with health check query - `inst-test-pool`
7. [ ] - `p2` - **RETURN** pool ready - `inst-return-pool-ready`

## 4. States (CDSL)

### N/A — Infrastructure Feature

No entity state machines for this infrastructure feature. Database tables do not have lifecycle states managed by this feature; entity states (e.g., user status, message states) are managed by features that use these tables.

## 5. Definitions of Done

### PostgreSQL Setup

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-database-foundation-postgres-setup`

The system **MUST** have a PostgreSQL 15+ database instance provisioned and accessible from the application environment.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-database-foundation-setup`

**Touches**:
- Infrastructure: PostgreSQL database server
- Config: DATABASE_URL environment variable

### Redis Setup

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-database-foundation-redis-setup`

The system **MUST** have a Redis 7+ instance provisioned and accessible for session management and caching.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-database-foundation-setup`

**Touches**:
- Infrastructure: Redis server
- Config: REDIS_URL environment variable

### Users Table

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-database-foundation-users-table`

The system **MUST** have a users table with columns for id, email, password_hash, oauth_provider, oauth_id, settings, status, created_at, updated_at. Email must be unique and indexed. Status must be constrained to valid values.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-users`

**Touches**:
- DB: `users` table

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-dbtable-users`

### Conversations Table

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-database-foundation-conversations-table`

The system **MUST** have a conversations table with columns for id, user_id, title, message_count, created_at, updated_at, deleted_at. user_id must reference users with cascade delete. Indexes on user_id and updated_at.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-conversations`

**Touches**:
- DB: `conversations` table

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-dbtable-conversations`

### Messages Table

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-database-foundation-messages-table`

The system **MUST** have a messages table with columns for id, conversation_id, role, content, metadata, parent_message_id, created_at. conversation_id must reference conversations with cascade delete. Role must be constrained to valid values.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-create-messages`

**Touches**:
- DB: `messages` table

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-dbtable-messages`

### Connection Pooling

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-database-foundation-connection-pool`

The system **MUST** have connection pooling configured with appropriate min/max connections and timeouts for production workloads.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool`

**Touches**:
- Config: Pool settings

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-principle-stateless-api`

### Migration Tooling

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-database-foundation-migrations`

The system **MUST** have migration tooling that can apply schema changes in order, track applied migrations, and rollback on failure.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations`

**Touches**:
- DB: `migrations` table
- Files: `migrations/` directory

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-persist-history`

## 6. Acceptance Criteria

- [ ] PostgreSQL database is accessible with provided connection string
- [ ] Redis instance is accessible with provided connection string
- [ ] All three tables (users, conversations, messages) exist with correct schemas
- [ ] Foreign key constraints are enforced (user_id, conversation_id)
- [ ] Check constraints are enforced (status, role)
- [ ] Indexes exist on frequently queried columns
- [ ] Connection pool handles concurrent requests without exhaustion
- [ ] Migrations can be run idempotently (re-running does not fail)

## 7. Additional Context

### Migration File Structure

```
migrations/
├── 001_create_users.sql
├── 002_create_conversations.sql
├── 003_create_messages.sql
└── 004_add_indexes.sql
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/aichat` |
| REDIS_URL | Redis connection string | `redis://localhost:6379` |
| DB_POOL_MIN | Minimum pool connections | `2` |
| DB_POOL_MAX | Maximum pool connections | `10` |

### Technology Choices

- **PostgreSQL**: Chosen for ACID compliance, JSONB support for flexible metadata, and mature ecosystem
- **Redis**: Chosen for fast session storage, rate limiting counters, and potential pub/sub for real-time features
