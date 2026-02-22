# Feature: Chat Core

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-featstatus-chat-core`

## 1. Feature Context

- [x] `p1` - `cpt-ai-chat-via-cyber-pilot-feature-chat-core`

### 1.1 Overview

Enable the core chat experience: sending messages, receiving streaming responses via SSE, stop/regenerate controls, context management, and LLM provider integration. This is the primary product functionality.

### 1.2 Purpose

This feature provides the main chat interaction layer that connects users with LLM-powered responses through a streaming interface.

**Problem**: Users need fast, responsive AI chat with streaming responses, context awareness, and control over generation.

**Primary value**: Delivers real-time streaming chat with sub-2-second time-to-first-token and intelligent context management.

**Key assumptions**: Conversation management is in place. OpenAI API is available. Redis is available for rate limiting.

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-ai-chat-via-cyber-pilot-actor-user` | Sends messages, receives responses, controls generation |
| `cpt-ai-chat-via-cyber-pilot-actor-llm` | Generates streaming responses |

### 1.4 References

- **PRD**: [PRD.md](../PRD.md)
- **Design**: [DESIGN.md](../DESIGN.md)
- **Dependencies**: `cpt-ai-chat-via-cyber-pilot-feature-conversation-mgmt`

## 2. Actor Flows (CDSL)

### Send Message Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`, `cpt-ai-chat-via-cyber-pilot-actor-llm`

**Success Scenarios**:
- User message saved to database
- Context built with conversation history
- Streaming response received via SSE
- Assistant message saved after completion
- Conversation title auto-generated if first response

**Error Scenarios**:
- Unauthorized — return 401
- Conversation not found — return 404
- Rate limit exceeded — return 429
- LLM provider error — return 502 with graceful message

**Steps**:
1. [x] - `p1` - User submits message via POST /api/v1/conversations/:id/messages - `inst-submit-message`
2. [x] - `p1` - Validate user is authenticated and owns conversation - `inst-validate-auth-owner`
3. [x] - `p1` - Algorithm: check rate limit using `cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit` - `inst-check-rate-limit`
4. [x] - `p1` - **IF** rate limit exceeded **THEN** return 429 Too Many Requests - `inst-rate-limit-exceeded`
5. [x] - `p1` - DB: INSERT INTO messages (conversation_id, role='user', content) - `inst-save-user-message`
6. [x] - `p1` - DB: UPDATE conversations SET message_count = message_count + 1, updated_at = NOW() - `inst-update-conversation`
7. [x] - `p1` - Algorithm: build context using `cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context` - `inst-build-context`
8. [x] - `p1` - Set SSE headers (Content-Type: text/event-stream) - `inst-set-sse-headers`
9. [x] - `p1` - Algorithm: stream LLM response using `cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm` - `inst-stream-llm`
10. [x] - `p1` - **FOR EACH** token received from LLM - `inst-token-loop`
    1. [x] - `p1` - Send SSE event with token data - `inst-send-sse-token`
    2. [x] - `p1` - Accumulate token to response buffer - `inst-accumulate-token`
11. [x] - `p1` - DB: INSERT INTO messages (conversation_id, role='assistant', content, metadata) - `inst-save-assistant-message`
12. [x] - `p1` - DB: UPDATE conversations SET message_count = message_count + 1, updated_at = NOW() - `inst-update-conversation-final`
13. [x] - `p1` - Algorithm: auto-generate title if first response using `cpt-ai-chat-via-cyber-pilot-algo-conversation-mgmt-auto-title` - `inst-auto-title`
14. [x] - `p1` - Send SSE done event with message ID - `inst-send-sse-done`

### Stop Generation Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Generation stopped within 1 second
- Partial response saved
- Client notified of stop

**Error Scenarios**:
- No active generation — return 404
- Unauthorized — return 401

**Steps**:
1. [x] - `p1` - User clicks stop or POST /api/v1/conversations/:id/stop - `inst-submit-stop`
2. [x] - `p1` - Validate user is authenticated and owns conversation - `inst-validate-auth-stop`
3. [x] - `p1` - Set abort flag in active generation context (Redis) - `inst-set-abort-flag`
4. [x] - `p1` - **RETURN** 200 OK with acknowledgment - `inst-return-stop-ack`

### Regenerate Response Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Last assistant message deleted or marked as replaced
- New response generated and streamed
- New assistant message saved

**Error Scenarios**:
- No assistant message to regenerate — return 400
- Unauthorized — return 401
- Rate limit exceeded — return 429

**Steps**:
1. [x] - `p1` - User clicks regenerate or POST /api/v1/conversations/:id/regenerate - `inst-submit-regenerate`
2. [x] - `p1` - Validate user is authenticated and owns conversation - `inst-validate-auth-regen`
3. [x] - `p1` - Algorithm: check rate limit using `cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit` - `inst-check-rate-limit-regen`
4. [x] - `p1` - DB: SELECT last message WHERE role='assistant' ORDER BY created_at DESC - `inst-find-last-assistant`
5. [x] - `p1` - **IF** no assistant message found **THEN** return 400 Bad Request - `inst-no-message-to-regen`
6. [x] - `p1` - DB: DELETE FROM messages WHERE id = :last_assistant_id - `inst-delete-last-assistant`
7. [x] - `p1` - DB: UPDATE conversations SET message_count = message_count - 1 - `inst-decrement-count`
8. [x] - `p1` - Algorithm: build context using `cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context` - `inst-build-context-regen`
9. [x] - `p1` - Set SSE headers - `inst-set-sse-headers-regen`
10. [x] - `p1` - Algorithm: stream LLM response using `cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm` - `inst-stream-llm-regen`
11. [x] - `p1` - DB: INSERT INTO messages (conversation_id, role='assistant', content, metadata) - `inst-save-regen-message`
12. [x] - `p1` - DB: UPDATE conversations SET message_count = message_count + 1, updated_at = NOW() - `inst-update-conversation-regen`
13. [x] - `p1` - Send SSE done event - `inst-send-sse-done-regen`

### Rate Limit Check Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Success Scenarios**:
- Request allowed within limits
- Rate limit headers returned

**Error Scenarios**:
- Rate limit exceeded — return 429 with retry-after header

**Steps**:
1. [x] - `p1` - Extract user ID and IP from request - `inst-extract-identifiers`
2. [x] - `p1` - REDIS: GET rate_limit:user:{user_id} - `inst-get-user-limit`
3. [x] - `p1` - REDIS: GET rate_limit:ip:{ip} - `inst-get-ip-limit`
4. [x] - `p1` - **IF** user limit exceeded OR ip limit exceeded **THEN** return 429 - `inst-limit-exceeded`
5. [x] - `p1` - REDIS: INCR rate_limit:user:{user_id} with TTL - `inst-incr-user-limit`
6. [x] - `p1` - REDIS: INCR rate_limit:ip:{ip} with TTL - `inst-incr-ip-limit`
7. [x] - `p1` - Set rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset) - `inst-set-rate-headers`

## 3. Processes / Business Logic (CDSL)

### Build Context

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context`

**Input**: Conversation ID, max tokens (default 4000)

**Output**: Array of messages for LLM context

**Steps**:
1. [x] - `p1` - Load system prompt from configuration - `inst-load-system-prompt`
2. [x] - `p1` - DB: SELECT messages FROM conversation ORDER BY created_at ASC - `inst-load-messages`
3. [x] - `p1` - Algorithm: count tokens for each message using `cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens` - `inst-count-message-tokens`
4. [x] - `p1` - Calculate total tokens including system prompt - `inst-calc-total-tokens`
5. [x] - `p1` - **WHILE** total tokens > max tokens - `inst-truncation-loop`
    1. [x] - `p1` - Remove oldest non-system message - `inst-remove-oldest`
    2. [x] - `p1` - Recalculate total tokens - `inst-recalc-tokens`
6. [x] - `p1` - Build context array: [system, ...messages] - `inst-build-array`
7. [x] - `p1` - **RETURN** context array - `inst-return-context`

### Stream LLM Response

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm`

**Input**: Context array, model name, abort signal

**Output**: Async iterator of tokens

**Steps**:
1. [x] - `p1` - Initialize OpenAI client with API key - `inst-init-openai`
2. [x] - `p1` - Create chat completion request with stream=true - `inst-create-request`
3. [x] - `p1` - **TRY** - `inst-try-stream`
    1. [x] - `p1` - **FOR EACH** chunk from stream - `inst-chunk-loop`
        1. [x] - `p1` - **IF** abort signal set **THEN** break - `inst-check-abort`
        2. [x] - `p1` - Extract token from chunk.choices[0].delta.content - `inst-extract-token`
        3. [x] - `p1` - **YIELD** token - `inst-yield-token`
4. [x] - `p1` - **CATCH** error - `inst-catch-error`
    1. [x] - `p1` - **IF** rate limit error **THEN** throw RateLimitError - `inst-handle-rate-limit`
    2. [x] - `p1` - **IF** timeout error **THEN** throw TimeoutError - `inst-handle-timeout`
    3. [x] - `p1` - Log error and throw LLMError with graceful message - `inst-handle-generic-error`

### Count Tokens

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens`

**Input**: Text string, model name

**Output**: Token count (number)

**Steps**:
1. [x] - `p1` - Get tiktoken encoding for model - `inst-get-encoding`
2. [x] - `p1` - Encode text to tokens - `inst-encode-text`
3. [x] - `p1` - **RETURN** tokens.length - `inst-return-count`

### Apply Rate Limit

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit`

**Input**: User ID, IP address

**Output**: { allowed: boolean, remaining: number, resetAt: number }

**Steps**:
1. [x] - `p1` - Define limits: user=60/min, ip=100/min for authenticated, ip=10/min for anonymous - `inst-define-limits`
2. [x] - `p1` - REDIS: GET rate_limit:user:{user_id}:count - `inst-get-user-count`
3. [x] - `p1` - REDIS: GET rate_limit:ip:{ip}:count - `inst-get-ip-count`
4. [x] - `p1` - Calculate remaining = limit - count - `inst-calc-remaining`
5. [x] - `p1` - **IF** remaining <= 0 **THEN** return { allowed: false, remaining: 0, resetAt } - `inst-return-blocked`
6. [x] - `p1` - REDIS: INCR with EXPIRE 60s - `inst-incr-count`
7. [x] - `p1` - **RETURN** { allowed: true, remaining, resetAt } - `inst-return-allowed`

## 4. States (CDSL)

### Message Generation State

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-state-message-generation`

```
[Idle] --send_message--> [Generating] --complete--> [Idle]
                              |
                              +--stop--> [Stopped] ---> [Idle]
                              |
                              +--error--> [Error] ---> [Idle]
```

**States**:
- **Idle**: No active generation, ready for new message
- **Generating**: LLM streaming in progress, tokens being sent via SSE
- **Stopped**: User stopped generation, partial response saved
- **Error**: LLM error occurred, error message displayed

**Transitions**:
- `send_message`: Idle → Generating
- `complete`: Generating → Idle (response saved)
- `stop`: Generating → Stopped → Idle (partial saved)
- `error`: Generating → Error → Idle (error displayed)

## 5. Definitions of Done

### Send Message Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-chat-core-send-message-endpoint`

The system **MUST** expose POST /api/v1/conversations/:id/messages that accepts user message, streams LLM response via SSE, and persists both messages.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message`
- `cpt-ai-chat-via-cyber-pilot-seq-send-message`

**Touches**:
- API: POST /api/v1/conversations/:id/messages (SSE)
- DB: messages table, conversations table
- External: OpenAI API

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-send-message`
- `cpt-ai-chat-via-cyber-pilot-fr-streaming`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`
- `cpt-ai-chat-via-cyber-pilot-component-api-gateway`
- `cpt-ai-chat-via-cyber-pilot-principle-streaming-first`

### Stop Generation Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-chat-core-stop-endpoint`

The system **MUST** expose POST /api/v1/conversations/:id/stop that halts active generation within 1 second and saves partial response.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop`

**Touches**:
- API: POST /api/v1/conversations/:id/stop
- Redis: abort flags

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-stop-regen`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`

### Regenerate Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-chat-core-regenerate-endpoint`

The system **MUST** expose POST /api/v1/conversations/:id/regenerate that deletes last assistant message and generates new streaming response.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate`

**Touches**:
- API: POST /api/v1/conversations/:id/regenerate (SSE)
- DB: messages table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-stop-regen`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-chat-service`

### Context Management

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-chat-core-context-management`

The system **MUST** build conversation context with system prompt, count tokens, and truncate oldest messages when exceeding context window.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-chat-core-build-context`
- `cpt-ai-chat-via-cyber-pilot-algo-chat-core-count-tokens`

**Touches**:
- DB: messages table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-context-mgmt`
- `cpt-ai-chat-via-cyber-pilot-fr-system-prompt`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-context-manager`
- `cpt-ai-chat-via-cyber-pilot-constraint-context-window`

### LLM Adapter

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-chat-core-llm-adapter`

The system **MUST** integrate with OpenAI API for streaming chat completions with error handling and circuit breaker pattern.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm`

**Touches**:
- External: OpenAI API

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-llm-routing`
- `cpt-ai-chat-via-cyber-pilot-nfr-performance`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-llm-adapter`
- `cpt-ai-chat-via-cyber-pilot-constraint-llm-dependency`
- `cpt-ai-chat-via-cyber-pilot-principle-graceful-degradation`

### Rate Limiting

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-chat-core-rate-limiting`

The system **MUST** enforce per-user and per-IP rate limits using Redis sliding window, returning 429 with retry-after when exceeded.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit`
- `cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check`

**Touches**:
- Redis: rate limit counters
- API: rate limit headers

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-rate-limiting`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-api-gateway`
- `cpt-ai-chat-via-cyber-pilot-constraint-rate-limits`

### Message Persistence

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-chat-core-message-persistence`

The system **MUST** persist user and assistant messages with metadata (model, token count, latency) after generation completes or stops.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message`

**Touches**:
- DB: messages table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-persist-history`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-dbtable-messages`

### Error Handling

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-chat-core-error-handling`

The system **MUST** handle LLM errors gracefully with user-friendly messages, implement circuit breaker for repeated failures, and log errors for debugging.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-algo-chat-core-stream-llm`

**Touches**:
- API: error responses
- Logging: error logs

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-nfr-availability`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-principle-graceful-degradation`

## 6. Acceptance Criteria

- [ ] POST /api/v1/conversations/:id/messages saves user message and streams response via SSE
- [ ] Time-to-first-token is under 2 seconds (P95)
- [ ] POST /api/v1/conversations/:id/stop halts generation within 1 second
- [ ] POST /api/v1/conversations/:id/regenerate replaces last assistant message
- [ ] Context is truncated when exceeding token limit (oldest messages removed first)
- [ ] System prompt is prepended to every context
- [ ] Rate limit returns 429 when user exceeds 60 requests/minute
- [ ] Rate limit returns 429 when IP exceeds 100 requests/minute (authenticated) or 10/minute (anonymous)
- [ ] LLM errors return 502 with graceful error message
- [ ] Assistant messages include metadata (model, tokenCount, latencyMs)
- [ ] Conversation title auto-generated after first assistant response
- [ ] SSE events include: token, done, error event types

## 7. Additional Context

### API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | /api/v1/conversations/:id/messages | Send message, stream response (SSE) | Yes |
| POST | /api/v1/conversations/:id/stop | Stop active generation | Yes |
| POST | /api/v1/conversations/:id/regenerate | Regenerate last response (SSE) | Yes |

### SSE Event Format

**Token Event**:
```
event: token
data: {"content": "Hello"}
```

**Done Event**:
```
event: done
data: {"messageId": "uuid", "tokenCount": 150, "latencyMs": 1234}
```

**Error Event**:
```
event: error
data: {"error": "Service temporarily unavailable", "code": "LLM_ERROR"}
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| OPENAI_API_KEY | OpenAI API key | `sk-...` |
| OPENAI_MODEL | Default model | `gpt-4o-mini` |
| OPENAI_MAX_TOKENS | Max response tokens | `4096` |
| CONTEXT_MAX_TOKENS | Max context window | `8000` |
| RATE_LIMIT_USER_PER_MIN | User rate limit | `60` |
| RATE_LIMIT_IP_PER_MIN | IP rate limit (auth) | `100` |
| RATE_LIMIT_ANON_PER_MIN | IP rate limit (anon) | `10` |

### System Prompt

Default system prompt stored in configuration:
```
You are a helpful AI assistant. Be concise and accurate in your responses.
Format code blocks with appropriate language tags for syntax highlighting.
```

### Rate Limit Headers

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Maximum requests per window |
| X-RateLimit-Remaining | Remaining requests in window |
| X-RateLimit-Reset | Unix timestamp when window resets |
| Retry-After | Seconds until rate limit resets (on 429) |
