# Feature: Content Moderation

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-featstatus-content-moderation`

## 1. Feature Context

- [x] `p2` - `cpt-ai-chat-via-cyber-pilot-feature-content-moderation`

### 1.1 Overview

Filter user inputs and assistant outputs for safety policy compliance. Block or flag disallowed content and provide user reporting mechanism for problematic responses.

### 1.2 Purpose

This feature provides content safety guardrails that protect users and ensure platform compliance with safety policies.

**Problem**: Users may submit harmful content or receive inappropriate AI responses that violate platform policies.

**Primary value**: Ensures safe, policy-compliant interactions while providing transparency through reporting mechanisms.

**Key assumptions**: Chat core is in place. OpenAI moderation API is available. Admin review queue exists.

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-ai-chat-via-cyber-pilot-actor-user` | Submits content, receives moderated responses, reports issues |
| `cpt-ai-chat-via-cyber-pilot-actor-admin` | Reviews reports, manages moderation policies |

### 1.4 References

- **PRD**: [PRD.md](../PRD.md)
- **Design**: [DESIGN.md](../DESIGN.md)
- **Dependencies**: `cpt-ai-chat-via-cyber-pilot-feature-chat-core`

## 2. Actor Flows (CDSL)

### Moderate Input Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Content passes moderation, proceeds to LLM
- Flagged content proceeds with safety_flags recorded
- Blocked content rejected with clear reason

**Error Scenarios**:
- Content violates policy — return 400 with reason
- Moderation service unavailable — proceed with warning (graceful degradation)

**Steps**:
1. [x] - `p1` - Receive user message content before LLM call - `inst-receive-input`
2. [x] - `p1` - Algorithm: check content safety using `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety` - `inst-check-input-safety`
3. [x] - `p1` - **IF** content blocked **THEN** return 400 with violation reason - `inst-block-input`
4. [x] - `p1` - **IF** content flagged **THEN** record safety_flags in message metadata - `inst-flag-input`
5. [x] - `p1` - Algorithm: log moderation event using `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event` - `inst-log-input-event`
6. [x] - `p1` - **RETURN** moderation result (pass/flag/block) - `inst-return-input-result`

### Moderate Output Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-llm`

**Success Scenarios**:
- Response passes moderation, displayed to user
- Flagged response displayed with safety_flags recorded
- Blocked response replaced with safe fallback message

**Error Scenarios**:
- Response violates policy — replace with fallback message
- Moderation service unavailable — proceed with warning

**Steps**:
1. [x] - `p1` - Receive assistant response content after LLM completion - `inst-receive-output`
2. [x] - `p1` - Algorithm: check content safety using `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety` - `inst-check-output-safety`
3. [x] - `p1` - **IF** content blocked **THEN** replace with fallback message - `inst-replace-blocked-output`
4. [x] - `p1` - **IF** content flagged **THEN** record safety_flags in message metadata - `inst-flag-output`
5. [x] - `p1` - Algorithm: log moderation event using `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event` - `inst-log-output-event`
6. [x] - `p1` - **RETURN** moderated content - `inst-return-output-result`

### Report Message Flow

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Report submitted and queued for admin review
- User receives confirmation

**Error Scenarios**:
- Message not found — return 404
- Not message owner — return 403
- Already reported — return 409

**Steps**:
1. [x] - `p2` - User clicks report button or POST /api/v1/messages/:id/report - `inst-submit-report`
2. [x] - `p2` - Validate user is authenticated - `inst-validate-auth-report`
3. [x] - `p2` - DB: SELECT FROM messages WHERE id = :id - `inst-fetch-message`
4. [x] - `p2` - **IF** message not found **THEN** return 404 - `inst-message-not-found`
5. [x] - `p2` - Validate user owns the conversation - `inst-validate-ownership`
6. [x] - `p2` - DB: SELECT FROM reports WHERE message_id = :id AND user_id = :user_id - `inst-check-existing-report`
7. [x] - `p2` - **IF** already reported **THEN** return 409 Conflict - `inst-already-reported`
8. [x] - `p2` - DB: INSERT INTO reports (message_id, user_id, reason, status, created_at) - `inst-create-report`
9. [x] - `p2` - Algorithm: log moderation event using `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event` - `inst-log-report-event`
10. [x] - `p2` - **RETURN** 201 Created with report ID - `inst-return-report-created`

### Review Reports Flow

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

**Success Scenarios**:
- Admin views pending reports
- Admin resolves report (dismiss/action taken)

**Error Scenarios**:
- Unauthorized — return 401
- Not admin — return 403

**Steps**:
1. [x] - `p2` - Admin requests GET /api/v1/admin/reports - `inst-request-reports`
2. [x] - `p2` - Validate admin role - `inst-validate-admin`
3. [x] - `p2` - DB: SELECT FROM reports WHERE status = 'pending' ORDER BY created_at ASC - `inst-fetch-pending-reports`
4. [x] - `p2` - **RETURN** paginated reports list - `inst-return-reports`
5. [x] - `p2` - Admin submits PATCH /api/v1/admin/reports/:id with resolution - `inst-submit-resolution`
6. [x] - `p2` - DB: UPDATE reports SET status = :status, resolved_by = :admin_id, resolved_at = NOW() - `inst-update-report`
7. [x] - `p2` - Algorithm: log moderation event using `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event` - `inst-log-resolution`
8. [x] - `p2` - **RETURN** updated report - `inst-return-resolved`

## 3. Processes / Business Logic (CDSL)

### Check Content Safety

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety`

**Input**: Text content, content type (input/output)

**Output**: { result: 'pass' | 'flag' | 'block', categories: string[], scores: object }

**Steps**:
1. [x] - `p1` - **IF** moderation disabled via config **THEN** return pass - `inst-check-enabled`
2. [x] - `p1` - **TRY** call OpenAI moderation API - `inst-try-openai-moderation`
3. [x] - `p1` - **CATCH** error - `inst-catch-moderation-error`
    1. [x] - `p1` - Log error and return pass (graceful degradation) - `inst-graceful-fallback`
4. [x] - `p1` - Extract flagged categories from response - `inst-extract-categories`
5. [x] - `p1` - **IF** any category score > block_threshold **THEN** result = 'block' - `inst-check-block-threshold`
6. [x] - `p1` - **ELSE IF** any category score > flag_threshold **THEN** result = 'flag' - `inst-check-flag-threshold`
7. [x] - `p1` - **ELSE** result = 'pass' - `inst-result-pass`
8. [x] - `p1` - **RETURN** { result, categories, scores } - `inst-return-safety-result`

### Log Moderation Event

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event`

**Input**: Event type, message ID, user ID, moderation result, metadata

**Output**: Log entry created

**Steps**:
1. [x] - `p2` - Build log entry with timestamp, event type, IDs - `inst-build-log-entry`
2. [x] - `p2` - Include moderation result and categories - `inst-include-result`
3. [x] - `p2` - DB: INSERT INTO moderation_logs (event_type, message_id, user_id, result, metadata, created_at) - `inst-insert-log`
4. [x] - `p2` - **RETURN** log entry ID - `inst-return-log-id`

## 4. States (CDSL)

### Report Lifecycle State

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-state-report-lifecycle`

```
[Pending] --review--> [Under Review] --dismiss--> [Dismissed]
                           |
                           +--action--> [Action Taken]
```

**States**:
- **Pending**: Report submitted, awaiting admin review
- **Under Review**: Admin is actively reviewing
- **Dismissed**: Report closed, no action needed
- **Action Taken**: Report resolved with corrective action

**Transitions**:
- `submit`: → Pending (new report)
- `review`: Pending → Under Review (admin opens)
- `dismiss`: Under Review → Dismissed (no violation)
- `action`: Under Review → Action Taken (violation confirmed)

## 5. Definitions of Done

### Input Moderation Middleware

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-content-moderation-input-middleware`

The system **MUST** check user message content against moderation API before sending to LLM, blocking violating content with clear error message.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input`

**Touches**:
- API: POST /api/v1/conversations/:id/messages (pre-processing)
- External: OpenAI Moderation API

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-moderation`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-moderation-service`

### Output Moderation Filter

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-content-moderation-output-filter`

The system **MUST** check assistant response content against moderation API before displaying, replacing violating content with safe fallback.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output`

**Touches**:
- API: SSE response stream (post-processing)
- External: OpenAI Moderation API

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-moderation`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-moderation-service`
- `cpt-ai-chat-via-cyber-pilot-principle-graceful-degradation`

### Report Message Endpoint

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-content-moderation-report-endpoint`

The system **MUST** expose POST /api/v1/messages/:id/report that allows users to report problematic assistant messages for admin review.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report`

**Touches**:
- API: POST /api/v1/messages/:id/report
- DB: reports table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-reporting`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-moderation-service`

### Moderation Logging

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-content-moderation-logging`

The system **MUST** log all moderation events (checks, blocks, flags, reports) for audit and review purposes.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event`

**Touches**:
- DB: moderation_logs table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-moderation`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-moderation-service`

### Safety Flags in Metadata

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-content-moderation-safety-flags`

The system **MUST** store moderation results (safety_flags) in message metadata for flagged content.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input`
- `cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output`

**Touches**:
- DB: messages.metadata.safety_flags

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-moderation`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-dbtable-messages`

## 6. Acceptance Criteria

- [ ] User message blocked if moderation API returns violation above block threshold
- [ ] Blocked content returns 400 with violation category
- [ ] Flagged content proceeds but stores safety_flags in metadata
- [ ] Assistant response replaced with fallback if blocked
- [ ] POST /api/v1/messages/:id/report creates report entry
- [ ] Duplicate reports return 409 Conflict
- [ ] Moderation latency < 500ms (P95)
- [ ] Graceful degradation if moderation API unavailable (proceed with warning)

## 7. Additional Context

### API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /api/v1/messages/:id/report | Report a message | Yes |
| GET | /api/v1/admin/reports | List pending reports | Admin |
| PATCH | /api/v1/admin/reports/:id | Resolve a report | Admin |

### Moderation Categories

OpenAI moderation API categories:
- `hate` - Hate speech
- `harassment` - Harassment content
- `self-harm` - Self-harm content
- `sexual` - Sexual content
- `violence` - Violence content

### Thresholds

| Category | Flag Threshold | Block Threshold |
|----------|----------------|-----------------|
| hate | 0.5 | 0.8 |
| harassment | 0.5 | 0.8 |
| self-harm | 0.3 | 0.6 |
| sexual | 0.5 | 0.8 |
| violence | 0.5 | 0.8 |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| MODERATION_ENABLED | Enable/disable moderation | `true` |
| MODERATION_BLOCK_THRESHOLD | Score to block content | `0.8` |
| MODERATION_FLAG_THRESHOLD | Score to flag content | `0.5` |

### Fallback Message

When assistant response is blocked:
```
I apologize, but I cannot provide that response as it may violate our content policies. Please try rephrasing your request.
```

### Report Object

```json
{
  "id": "uuid",
  "messageId": "uuid",
  "userId": "uuid",
  "reason": "string (optional)",
  "status": "pending|under_review|dismissed|action_taken",
  "createdAt": "ISO8601",
  "resolvedAt": "ISO8601|null",
  "resolvedBy": "uuid|null"
}
```
