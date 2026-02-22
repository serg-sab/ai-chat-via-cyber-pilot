# Feature: Conversation Management

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-featstatus-conversation-mgmt`

## 1. Feature Context

- [ ] `p1` - `cpt-ai-chat-via-cyber-pilot-feature-conversation-mgmt`

### 1.1 Overview

Enable users to create, list, rename, delete, and search conversations. Provides the organizational layer for chat history with sidebar navigation and full-text search capabilities.

### 1.2 Purpose

This feature provides the conversation management layer that organizes chat history and enables users to navigate between multiple conversations.

**Problem**: Users need to organize and navigate their chat history across multiple conversations and topics.

**Primary value**: Enables persistent conversation organization with intuitive sidebar navigation and search.

**Key assumptions**: User authentication is in place. Database foundation with conversations and messages tables exists.

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-ai-chat-via-cyber-pilot-actor-user` | Creates, lists, renames, deletes, and searches conversations |

### 1.4 References

- **PRD**: [PRD.md](../PRD.md)
- **Design**: [DESIGN.md](../DESIGN.md)
- **Dependencies**: `cpt-ai-chat-via-cyber-pilot-feature-database-foundation`, `cpt-ai-chat-via-cyber-pilot-feature-user-auth`

## 2. Actor Flows (CDSL)

### Create Conversation Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- New conversation created with default title
- Conversation ID returned to client
- User redirected to new conversation

**Error Scenarios**:
- Unauthorized — return 401
- Server error — return 500

**Steps**:
1. [x] - `p1` - User clicks "New Chat" or POST /api/v1/conversations - `inst-submit-create`
2. [x] - `p1` - Validate user is authenticated - `inst-validate-auth`
3. [x] - `p1` - DB: INSERT INTO conversations (user_id, title, created_at, updated_at) - `inst-insert-conversation`
4. [x] - `p1` - **RETURN** conversation object with id, title, created_at - `inst-return-conversation`

### List Conversations Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Paginated list of user's conversations returned
- Sorted by updated_at descending (most recent first)
- Deleted conversations excluded

**Error Scenarios**:
- Unauthorized — return 401

**Steps**:
1. [x] - `p1` - User loads sidebar or GET /api/v1/conversations - `inst-submit-list`
2. [x] - `p1` - Validate user is authenticated - `inst-validate-auth-list`
3. [x] - `p1` - Parse pagination params (limit, offset) with defaults - `inst-parse-pagination`
4. [x] - `p1` - DB: SELECT FROM conversations WHERE user_id = :user_id AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT :limit OFFSET :offset - `inst-select-conversations`
5. [x] - `p1` - DB: SELECT COUNT(*) FROM conversations WHERE user_id = :user_id AND deleted_at IS NULL - `inst-count-conversations`
6. [x] - `p1` - **RETURN** conversations array with pagination metadata - `inst-return-list`

### Get Conversation Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Conversation with messages returned
- Messages sorted by created_at ascending

**Error Scenarios**:
- Unauthorized — return 401
- Conversation not found — return 404
- Not owner — return 403

**Steps**:
1. [x] - `p1` - User clicks conversation or GET /api/v1/conversations/:id - `inst-submit-get`
2. [x] - `p1` - Validate user is authenticated - `inst-validate-auth-get`
3. [x] - `p1` - DB: SELECT FROM conversations WHERE id = :id AND deleted_at IS NULL - `inst-select-conversation`
4. [x] - `p1` - **IF** conversation not found **THEN** return 404 - `inst-not-found`
5. [x] - `p1` - **IF** conversation.user_id != current_user.id **THEN** return 403 - `inst-not-owner`
6. [x] - `p1` - DB: SELECT FROM messages WHERE conversation_id = :id ORDER BY created_at ASC - `inst-select-messages`
7. [x] - `p1` - **RETURN** conversation with messages array - `inst-return-conversation-messages`

### Rename Conversation Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Conversation title updated
- Updated conversation returned

**Error Scenarios**:
- Unauthorized — return 401
- Conversation not found — return 404
- Not owner — return 403
- Invalid title — return 400

**Steps**:
1. [x] - `p1` - User edits title or PATCH /api/v1/conversations/:id with { title } - `inst-submit-rename`
2. [x] - `p1` - Validate user is authenticated - `inst-validate-auth-rename`
3. [x] - `p1` - Validate title is non-empty string, max 255 chars - `inst-validate-title`
4. [x] - `p1` - DB: SELECT FROM conversations WHERE id = :id AND deleted_at IS NULL - `inst-select-for-rename`
5. [x] - `p1` - **IF** conversation not found **THEN** return 404 - `inst-not-found-rename`
6. [x] - `p1` - **IF** conversation.user_id != current_user.id **THEN** return 403 - `inst-not-owner-rename`
7. [x] - `p1` - DB: UPDATE conversations SET title = :title, updated_at = NOW() WHERE id = :id - `inst-update-title`
8. [x] - `p1` - **RETURN** updated conversation - `inst-return-renamed`

### Delete Conversation Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Conversation soft-deleted (deleted_at set)
- Removed from user's list

**Error Scenarios**:
- Unauthorized — return 401
- Conversation not found — return 404
- Not owner — return 403

**Steps**:
1. [x] - `p1` - User clicks delete or DELETE /api/v1/conversations/:id - `inst-submit-delete`
2. [x] - `p1` - Validate user is authenticated - `inst-validate-auth-delete`
3. [x] - `p1` - DB: SELECT FROM conversations WHERE id = :id AND deleted_at IS NULL - `inst-select-for-delete`
4. [x] - `p1` - **IF** conversation not found **THEN** return 404 - `inst-not-found-delete`
5. [x] - `p1` - **IF** conversation.user_id != current_user.id **THEN** return 403 - `inst-not-owner-delete`
6. [x] - `p1` - DB: UPDATE conversations SET deleted_at = NOW() WHERE id = :id - `inst-soft-delete`
7. [x] - `p1` - **RETURN** 204 No Content - `inst-return-deleted`

### Search Conversations Flow

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Matching conversations returned
- Search matches title and message content
- Results sorted by relevance/recency

**Error Scenarios**:
- Unauthorized — return 401
- Empty query — return 400

**Steps**:
1. [x] - `p2` - User enters search query or GET /api/v1/conversations/search?q=:query - `inst-submit-search`
2. [x] - `p2` - Validate user is authenticated - `inst-validate-auth-search`
3. [x] - `p2` - Validate query is non-empty - `inst-validate-query`
4. [x] - `p2` - DB: SELECT DISTINCT c.* FROM conversations c LEFT JOIN messages m ON c.id = m.conversation_id WHERE c.user_id = :user_id AND c.deleted_at IS NULL AND (c.title ILIKE :pattern OR m.content ILIKE :pattern) ORDER BY c.updated_at DESC LIMIT :limit - `inst-search-query`
5. [x] - `p2` - **RETURN** matching conversations array - `inst-return-search-results`

## 3. Processes / Business Logic (CDSL)

### Auto-Generate Title

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title`

**Input**: Conversation ID, first assistant response content

**Output**: Generated title string

**Trigger**: Called after first assistant message is saved

**Steps**:
1. [x] - `p1` - Check if conversation title is default ("New Chat") - `inst-check-default-title`
2. [x] - `p1` - **IF** title is not default **THEN** skip (user already renamed) - `inst-skip-if-renamed`
3. [x] - `p1` - Extract first 50 characters of assistant response - `inst-extract-preview`
4. [x] - `p1` - Clean and truncate to create title (remove markdown, trim) - `inst-clean-title`
5. [x] - `p1` - DB: UPDATE conversations SET title = :generated_title WHERE id = :id - `inst-update-auto-title`
6. [x] - `p1` - **RETURN** generated title - `inst-return-auto-title`

### Build Conversation List

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list`

**Input**: User ID, pagination params (limit, offset)

**Output**: Paginated conversation list with metadata

**Steps**:
1. [x] - `p1` - Set default limit (20) and offset (0) if not provided - `inst-set-defaults`
2. [x] - `p1` - Cap limit at maximum (100) - `inst-cap-limit`
3. [x] - `p1` - Execute count query for total - `inst-exec-count`
4. [x] - `p1` - Execute select query with pagination - `inst-exec-select`
5. [x] - `p1` - Calculate hasMore = (offset + limit) < total - `inst-calc-has-more`
6. [x] - `p1` - **RETURN** { conversations, total, limit, offset, hasMore } - `inst-return-paginated`

## 4. States (CDSL)

### Conversation Lifecycle State

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-state-conversation-lifecycle`

```
[Created] --add_message--> [Active] --delete--> [Deleted]
    |                          |
    +--------delete------------+
```

**States**:
- **Created**: New conversation with no messages, default title
- **Active**: Conversation has messages, may have custom title
- **Deleted**: Soft-deleted, excluded from queries, retained for data retention

**Transitions**:
- `create`: → Created (new conversation)
- `add_message`: Created → Active (first message added)
- `delete`: Created/Active → Deleted (soft delete)

## 5. Definitions of Done

### Create Conversation Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-create-endpoint`

The system **MUST** expose POST /api/v1/conversations that creates a new conversation for the authenticated user and returns the conversation object.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create`

**Touches**:
- API: POST /api/v1/conversations
- DB: conversations table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-new-chat`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`

### List Conversations Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-list-endpoint`

The system **MUST** expose GET /api/v1/conversations that returns a paginated list of the user's conversations sorted by updated_at descending.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list`
- `cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-build-list`

**Touches**:
- API: GET /api/v1/conversations
- DB: conversations table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-sidebar-list`
- `cpt-ai-chat-via-cyber-pilot-fr-persist-history`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`

### Get Conversation Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-get-endpoint`

The system **MUST** expose GET /api/v1/conversations/:id that returns the conversation with its messages for the authenticated owner.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get`

**Touches**:
- API: GET /api/v1/conversations/:id
- DB: conversations table, messages table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-persist-history`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`
- `cpt-ai-chat-via-cyber-pilot-dbtable-conversations`
- `cpt-ai-chat-via-cyber-pilot-dbtable-messages`

### Rename Conversation Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-rename-endpoint`

The system **MUST** expose PATCH /api/v1/conversations/:id that updates the conversation title for the authenticated owner.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename`

**Touches**:
- API: PATCH /api/v1/conversations/:id
- DB: conversations table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-rename-delete`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`

### Delete Conversation Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-delete-endpoint`

The system **MUST** expose DELETE /api/v1/conversations/:id that soft-deletes the conversation for the authenticated owner.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete`

**Touches**:
- API: DELETE /api/v1/conversations/:id
- DB: conversations table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-rename-delete`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`

### Search Conversations Endpoint

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-search-endpoint`

The system **MUST** expose GET /api/v1/conversations/search that searches conversation titles and message content for the authenticated user.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search`

**Touches**:
- API: GET /api/v1/conversations/search
- DB: conversations table, messages table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-search`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`

### Auto-Title Generation

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-auto-title`

The system **MUST** automatically generate a conversation title from the first assistant response when the title is still the default "New Chat".

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title`

**Touches**:
- DB: conversations table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-sidebar-list`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`

## 6. Acceptance Criteria

- [ ] POST /api/v1/conversations creates conversation and returns object with id
- [ ] GET /api/v1/conversations returns paginated list sorted by updated_at DESC
- [ ] GET /api/v1/conversations/:id returns conversation with messages
- [ ] PATCH /api/v1/conversations/:id updates title
- [ ] DELETE /api/v1/conversations/:id soft-deletes (sets deleted_at)
- [ ] GET /api/v1/conversations/search returns matching conversations
- [ ] Only conversation owner can access their conversations (403 for others)
- [ ] Deleted conversations excluded from list and search
- [ ] Auto-title generated after first assistant response
- [ ] Pagination works correctly with limit/offset params

## 7. Additional Context

### API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /api/v1/conversations | Create new conversation | Yes |
| GET | /api/v1/conversations | List user's conversations | Yes |
| GET | /api/v1/conversations/:id | Get conversation with messages | Yes |
| PATCH | /api/v1/conversations/:id | Rename conversation | Yes |
| DELETE | /api/v1/conversations/:id | Soft-delete conversation | Yes |
| GET | /api/v1/conversations/search | Search conversations | Yes |

### Query Parameters

| Endpoint | Parameter | Type | Default | Description |
|----------|-----------|------|---------|-------------|
| GET /conversations | limit | number | 20 | Max conversations to return |
| GET /conversations | offset | number | 0 | Pagination offset |
| GET /search | q | string | required | Search query |
| GET /search | limit | number | 20 | Max results to return |

### Response Formats

**Conversation Object**:
```json
{
  "id": "uuid",
  "title": "string",
  "messageCount": 0,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Conversation with Messages**:
```json
{
  "id": "uuid",
  "title": "string",
  "messages": [
    {
      "id": "uuid",
      "role": "user|assistant|system",
      "content": "string",
      "createdAt": "ISO8601"
    }
  ],
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Paginated List**:
```json
{
  "conversations": [...],
  "total": 100,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```
