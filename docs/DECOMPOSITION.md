# Decomposition: AI Chat

## 1. Overview

The AI Chat DESIGN is decomposed into six features organized around core chat capabilities. The decomposition follows a dependency order where foundational infrastructure (database, authentication) enables higher-level features (chat, moderation, admin).

**Decomposition Strategy**:
- **Foundation-first**: Database schema and authentication before business logic
- **Vertical slices**: Each feature delivers end-to-end functionality
- **High cohesion**: Related components grouped together (e.g., all auth components in one feature)
- **Loose coupling**: Features minimize dependencies on each other
- **100% coverage**: All DESIGN elements assigned to exactly one feature

**Feature Ordering Rationale**:
1. Database Foundation — required by all other features
2. User Authentication — required for user-specific features
3. Conversation Management — required for chat operations
4. Chat Core — main product functionality
5. Content Moderation — safety layer on top of chat
6. Admin Dashboard — observability and management

## 2. Entries

**Overall implementation status:**

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-status-overall`

### 2.1 [Database Foundation](features/database-foundation/) ⏳ HIGH

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-feature-database-foundation`

- **Purpose**: Establish the foundational database schema and infrastructure required by all other features. This includes PostgreSQL setup, Redis configuration, and core table definitions.

- **Depends On**: None

- **Scope**:
  - PostgreSQL database setup and configuration
  - Redis cache setup and configuration
  - Users table schema and migrations
  - Conversations table schema and migrations
  - Messages table schema and migrations
  - Database connection pooling
  - Migration tooling setup

- **Out of scope**:
  - Application-level data access logic
  - Business logic validation
  - API endpoints

- **Requirements Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-persist-history`

- **Design Principles Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-principle-stateless-api`

- **Design Constraints Covered**:

  None directly — foundational infrastructure

- **Domain Model Entities**:
  - User
  - Conversation
  - Message

- **Design Components**:

  None directly — infrastructure layer

- **API**:
  - None — database layer only

- **Sequences**:

  None directly — infrastructure layer

- **Data**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-dbtable-users`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-dbtable-conversations`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-dbtable-messages`

### 2.2 [User Authentication](features/user-auth/) ⏳ HIGH

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-feature-user-auth`

- **Purpose**: Enable user registration, login, and session management. Supports email/password and OAuth (Google) authentication flows with JWT-based sessions.

- **Depends On**: `cpt-ai-chat-via-cyber-pilot-feature-database-foundation`

- **Scope**:
  - User registration (email/password)
  - User login (email/password)
  - OAuth login (Google)
  - JWT token generation and validation
  - Session management via Redis
  - Password hashing (bcrypt)
  - Logout and session invalidation

- **Out of scope**:
  - Password reset flow
  - Email verification
  - Multi-factor authentication
  - SSO/SAML (enterprise)

- **Requirements Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-auth`

- **Design Principles Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-principle-stateless-api`

- **Design Constraints Covered**:

  None directly

- **Domain Model Entities**:
  - User

- **Design Components**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-auth-service`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-api-gateway` (auth middleware)

- **API**:
  - POST /api/v1/auth/register
  - POST /api/v1/auth/login
  - POST /api/v1/auth/oauth/google
  - POST /api/v1/auth/logout
  - GET /api/v1/auth/me

- **Sequences**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-seq-auth-login`

- **Data**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-dbtable-users`

### 2.3 [Conversation Management](features/conversation-mgmt/) ⏳ HIGH

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-feature-conversation-mgmt`

- **Purpose**: Enable users to create, list, rename, delete, and search conversations. Provides the organizational layer for chat history.

- **Depends On**: `cpt-ai-chat-via-cyber-pilot-feature-database-foundation`, `cpt-ai-chat-via-cyber-pilot-feature-user-auth`

- **Scope**:
  - Create new conversation
  - List user's conversations (sidebar)
  - Get conversation with messages
  - Rename conversation
  - Delete conversation (soft delete)
  - Search conversations by title and content
  - Auto-title generation after first response

- **Out of scope**:
  - Conversation sharing/public links
  - Conversation export
  - Conversation branching UI

- **Requirements Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-new-chat`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-persist-history`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-sidebar-list`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-rename-delete`
  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-fr-search`

- **Design Principles Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-principle-stateless-api`

- **Design Constraints Covered**:

  None directly

- **Domain Model Entities**:
  - Conversation
  - Message

- **Design Components**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-chat-service` (conversation operations)
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-api-gateway` (conversation endpoints)
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-chat-ui` (sidebar, conversation list)

- **API**:
  - GET /api/v1/conversations
  - POST /api/v1/conversations
  - GET /api/v1/conversations/:id
  - PATCH /api/v1/conversations/:id
  - DELETE /api/v1/conversations/:id
  - GET /api/v1/conversations/search

- **Sequences**:

  None directly — CRUD operations

- **Data**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-dbtable-conversations`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-dbtable-messages`

### 2.4 [Chat Core](features/chat-core/) ⏳ HIGH

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-feature-chat-core`

- **Purpose**: Enable the core chat experience: sending messages, receiving streaming responses, stop/regenerate controls, and message formatting. This is the primary product functionality.

- **Depends On**: `cpt-ai-chat-via-cyber-pilot-feature-conversation-mgmt`

- **Scope**:
  - Send user message
  - Receive streaming assistant response (SSE)
  - Stop generation mid-stream
  - Regenerate last response
  - Context management (token counting, truncation)
  - LLM provider integration (OpenAI)
  - Markdown rendering with syntax highlighting
  - Code block copy button
  - Rate limiting (per-user, per-IP)
  - System prompt application

- **Out of scope**:
  - Edit and resend (branching)
  - File attachments
  - Tool calling
  - Multiple model selection UI

- **Requirements Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-send-message`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-streaming`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-stop-regen`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-formatting`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-llm-routing`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-context-mgmt`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-system-prompt`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-rate-limiting`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-nfr-performance`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-nfr-availability`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-nfr-security`

- **Design Principles Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-principle-streaming-first`
  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-principle-graceful-degradation`

- **Design Constraints Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-constraint-llm-dependency`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-constraint-context-window`
  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-constraint-rate-limits`

- **Domain Model Entities**:
  - Message
  - Conversation

- **Design Components**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-chat-ui` (message thread, composer, streaming display)
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-api-gateway` (SSE streaming, rate limiting)
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-chat-service` (message handling, orchestration)
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-context-manager`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-llm-adapter`

- **API**:
  - POST /api/v1/conversations/:id/messages (SSE streaming response)
  - POST /api/v1/conversations/:id/regenerate
  - POST /api/v1/conversations/:id/stop

- **Sequences**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-seq-send-message`

- **Data**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-dbtable-messages`

### 2.5 [Content Moderation](features/content-moderation/) ⏳ MEDIUM

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-feature-content-moderation`

- **Purpose**: Filter user inputs and assistant outputs for safety policy compliance. Block or flag disallowed content and provide user reporting mechanism.

- **Depends On**: `cpt-ai-chat-via-cyber-pilot-feature-chat-core`

- **Scope**:
  - Input moderation (before LLM)
  - Output moderation (before display)
  - Content blocking for policy violations
  - User report button on assistant messages
  - Report submission to admin queue
  - Moderation logging for review

- **Out of scope**:
  - Prompt injection defenses (Phase 2)
  - Custom moderation policies
  - Real-time moderation dashboard

- **Requirements Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-moderation`
  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-fr-reporting`

- **Design Principles Covered**:

  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-principle-graceful-degradation`

- **Design Constraints Covered**:

  None directly

- **Domain Model Entities**:
  - Message (safety flags in metadata)

- **Design Components**:

  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-component-moderation-service`
  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-chat-ui` (report button)

- **API**:
  - POST /api/v1/messages/:id/report

- **Sequences**:

  None directly — integrated into send-message flow

- **Data**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-dbtable-messages` (safety_flags in metadata)

### 2.6 [Admin Dashboard](features/admin-dashboard/) ⏳ MEDIUM

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-feature-admin-dashboard`

- **Purpose**: Provide admin visibility into system health, usage metrics, costs, and user reports. Enable incident response controls.

- **Depends On**: `cpt-ai-chat-via-cyber-pilot-feature-chat-core`, `cpt-ai-chat-via-cyber-pilot-feature-content-moderation`

- **Scope**:
  - Metrics dashboard (request volume, latency, errors)
  - Token usage and cost estimates
  - Top users by usage (privacy-aware)
  - User reports queue
  - Kill switch for model/provider
  - Feature flags management

- **Out of scope**:
  - User management UI
  - Billing integration
  - Custom alerting rules

- **Requirements Covered**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-fr-dashboard`
  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-fr-logs`
  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-fr-incident-controls`
  - [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-nfr-scalability`

- **Design Principles Covered**:

  None directly — observability layer

- **Design Constraints Covered**:

  None directly

- **Domain Model Entities**:
  - User (usage stats)
  - Message (metrics)

- **Design Components**:

  - [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-component-api-gateway` (metrics collection)

- **API**:
  - GET /api/v1/admin/metrics
  - GET /api/v1/admin/reports
  - POST /api/v1/admin/feature-flags
  - POST /api/v1/admin/kill-switch

- **Sequences**:

  None directly — admin operations

- **Data**:

  None directly — aggregates from existing tables

---

## 3. Feature Dependencies

```text
cpt-ai-chat-via-cyber-pilot-feature-database-foundation
    │
    ├─→ cpt-ai-chat-via-cyber-pilot-feature-user-auth
    │       │
    │       └─→ cpt-ai-chat-via-cyber-pilot-feature-conversation-mgmt
    │               │
    │               └─→ cpt-ai-chat-via-cyber-pilot-feature-chat-core
    │                       │
    │                       ├─→ cpt-ai-chat-via-cyber-pilot-feature-content-moderation
    │                       │
    │                       └─→ cpt-ai-chat-via-cyber-pilot-feature-admin-dashboard
    │                               │
    │                               └─ (also depends on content-moderation for reports)
```

**Dependency Rationale**:

- `cpt-ai-chat-via-cyber-pilot-feature-user-auth` requires `cpt-ai-chat-via-cyber-pilot-feature-database-foundation`: Auth needs users table and Redis for sessions
- `cpt-ai-chat-via-cyber-pilot-feature-conversation-mgmt` requires `cpt-ai-chat-via-cyber-pilot-feature-user-auth`: Conversations are user-owned, require authentication
- `cpt-ai-chat-via-cyber-pilot-feature-chat-core` requires `cpt-ai-chat-via-cyber-pilot-feature-conversation-mgmt`: Messages belong to conversations
- `cpt-ai-chat-via-cyber-pilot-feature-content-moderation` requires `cpt-ai-chat-via-cyber-pilot-feature-chat-core`: Moderation wraps chat message flow
- `cpt-ai-chat-via-cyber-pilot-feature-admin-dashboard` requires `cpt-ai-chat-via-cyber-pilot-feature-chat-core`: Metrics come from chat operations
- `cpt-ai-chat-via-cyber-pilot-feature-admin-dashboard` requires `cpt-ai-chat-via-cyber-pilot-feature-content-moderation`: Admin reviews user reports

**Parallel Development Opportunities**:
- Features 5 and 6 (Content Moderation and Admin Dashboard) can be developed in parallel after Chat Core is complete
