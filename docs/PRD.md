# PRD — AI Chat

## 1. Overview

### 1.1 Purpose

AI Chat is a web-based conversational AI application that provides users with a fast, reliable interface for interacting with large language models. The system delivers streaming responses, maintains multi-turn conversation context, persists chat history, and includes safety controls with admin observability.

### 1.2 Background / Problem Statement

Users need accessible AI chat interfaces that combine responsiveness with reliability. Existing solutions often lack proper streaming support, context management across long conversations, or adequate safety and moderation controls.

**Target Users**:

- Individuals seeking quick AI assistance for questions, writing, coding, and analysis
- Power users who need persistent conversation history and customizable settings
- Organizations requiring visibility into usage, costs, and content safety

**Key Problems Solved**:

- Slow or non-streaming responses that feel unresponsive
- Lost conversation context in long multi-turn chats
- Lack of conversation history and organization
- Missing safety controls and admin observability
- No rate limiting or abuse prevention

### 1.3 Goals (Business Outcomes)

**Success Criteria**:

- P95 time-to-first-token under 2 seconds (Baseline: N/A; Target: v1.0)
- P95 end-to-end response time under 8 seconds for short answers (Baseline: N/A; Target: v1.0)
- 99.5% uptime for MVP (Baseline: N/A; Target: v1.0)
- Support 500 concurrent active users (Baseline: N/A; Target: v1.0)
- Backend latency excluding model under 300ms at P95 (Baseline: N/A; Target: v1.0)

**Capabilities**:

- Real-time streaming chat with LLM providers
- Multi-turn conversation with context management
- Persistent conversation history with search
- User accounts with settings and preferences
- Content moderation and safety controls
- Admin dashboard for metrics and observability

### 1.4 Glossary

| Term | Definition |
|------|------------|
| Conversation | A sequence of messages between user and assistant with shared context |
| Message | A single turn in a conversation, either from user, assistant, or system |
| Streaming | Delivering response tokens incrementally as they are generated |
| Token | The smallest unit of text processed by the LLM (roughly 4 characters) |
| Context Window | The maximum number of tokens the model can process in one request |
| Moderation | Filtering or blocking content that violates safety policies |
| TTFT | Time-to-first-token, latency before streaming begins |

## 2. Actors

### 2.1 Human Actors

#### Anonymous Visitor

**ID**: `cpt-ai-chat-via-cyber-pilot-actor-anon`

**Role**: Tries the chat interface quickly with limited features before signing up.  
**Needs**: Quick access to basic chat functionality without account creation; clear path to sign up for full features.

#### Logged-in User

**ID**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Role**: Primary user who interacts with the chat daily, expects persistent history, customizable settings, and reliable service.  
**Needs**: Fast streaming responses, conversation history across sessions, ability to search and organize chats, theme and model preferences.

#### Admin/Support

**ID**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

**Role**: Monitors system health, usage metrics, costs, and handles abuse reports and user support tickets.  
**Needs**: Real-time metrics dashboard, access to logs and traces, ability to review reported content, kill switches for incidents.

### 2.2 System Actors

#### LLM Provider

**ID**: `cpt-ai-chat-via-cyber-pilot-actor-llm`

**Role**: External AI model service that processes prompts and generates responses.

#### Moderation Service

**ID**: `cpt-ai-chat-via-cyber-pilot-actor-moderator`

**Role**: Filters input and output content against safety policies, flags or blocks disallowed content.

## 3. Operational Concept & Environment

### 3.1 Module-Specific Environment Constraints

None beyond standard web application requirements.

## 4. Scope

### 4.1 In Scope

- Chat interface with streaming responses
- User authentication (email/password or OAuth)
- Conversation history persistence and search
- Conversation rename and delete
- Basic content moderation
- Admin metrics dashboard
- Rate limiting per user and IP

### 4.2 Out of Scope

- Voice mode and real-time calling
- Image generation or editing UI
- On-device inference
- Enterprise organization features (SSO, SCIM, RBAC, data residency)
- Full agent automations (scheduled tasks, toolchains)
- File attachments and RAG (Phase 2)
- Conversation sharing links (Phase 2)
- Tool calling and function execution (Phase 3)

## 5. Functional Requirements

### 5.1 Chat Experience (Core)

#### FR-CHAT-001 New Conversation

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-new-chat`

The system MUST allow users to create a new conversation. "New chat" clears the current thread and starts a new conversation with a unique identifier.

**Rationale**: Users need a clear way to start fresh conversations on new topics.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`, `cpt-ai-chat-via-cyber-pilot-actor-anon`

#### FR-CHAT-002 Send and Receive Messages

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-send-message`

The system MUST allow users to send messages and receive assistant responses. User messages appear instantly in the UI; assistant responses appear as they are generated.

**Rationale**: Core chat functionality enabling user-AI interaction.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`, `cpt-ai-chat-via-cyber-pilot-actor-anon`, `cpt-ai-chat-via-cyber-pilot-actor-llm`

#### FR-CHAT-003 Streaming Responses

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-streaming`

The system MUST stream assistant responses token-by-token or chunk-by-chunk. Partial response MUST be visible within 500ms–1500ms of request start (depending on model latency).

**Rationale**: Streaming provides immediate feedback and perceived responsiveness.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`, `cpt-ai-chat-via-cyber-pilot-actor-llm`

#### FR-CHAT-004 Stop and Regenerate

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-stop-regen`

The system MUST allow users to stop generation mid-stream. The system MUST allow users to regenerate the last assistant response. Stop halts streaming within approximately 1 second; Regenerate replaces or branches from the last turn.

**Rationale**: Users need control over long or unsatisfactory responses.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

#### FR-CHAT-005 Edit and Resend

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-edit-resend`

The system MUST allow users to edit a previous user message and re-run from that point, creating a branch. The original conversation branch remains accessible.

**Rationale**: Users often want to refine their questions without losing prior context.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

#### FR-CHAT-006 Message Formatting

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-formatting`

The system MUST render Markdown including headings, lists, tables, and links. The system MUST render code blocks with syntax highlighting and a copy button. Markdown MUST be rendered safely without script injection.

**Rationale**: Rich formatting improves readability, especially for code and structured content.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

### 5.2 Conversation History

#### FR-HIST-001 Persist Conversations

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-persist-history`

The system MUST persist conversations for logged-in users. Reloading the page shows prior conversations.

**Rationale**: Users expect their chat history to be available across sessions.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

#### FR-HIST-002 Sidebar Conversation List

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-sidebar-list`

The system MUST display a sidebar list of conversations with title and last updated time. New chats auto-title after the first assistant response, or users can rename manually.

**Rationale**: Users need to navigate between multiple conversations easily.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

#### FR-HIST-003 Rename and Delete Conversations

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-rename-delete`

The system MUST allow users to rename and delete conversations. Delete removes from UI; backend retains per retention policy.

**Rationale**: Users need to organize and clean up their conversation history.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

#### FR-HIST-004 Search Conversations

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-search`

The system MUST allow users to search conversation titles and message content. Query returns matching threads within 1 second for typical user history.

**Rationale**: Users with many conversations need to find specific topics quickly.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

### 5.3 Authentication and User Settings

#### FR-AUTH-001 User Authentication

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-auth`

The system MUST support authentication via email and password or OAuth (Google). Logged-in state persists across sessions; sign-out works reliably.

**Rationale**: Account system enables conversation persistence and personalization.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`, `cpt-ai-chat-via-cyber-pilot-actor-anon`

#### FR-USER-001 User Settings

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-user-settings`

The system MUST allow users to configure theme (light/dark/system) and default model (if multiple available). Settings persist across devices.

**Rationale**: Personalization improves user experience and retention.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

#### FR-PRIV-001 Privacy Controls

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-privacy`

The system MUST provide "Improve the model" opt-in/out toggle (if training on user data). The system MUST provide a "Delete account" flow.

**Rationale**: Users need control over their data and privacy choices.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`

### 5.4 Model Orchestration

#### FR-MODEL-001 LLM Provider Integration

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-llm-routing`

The system MUST support at least one LLM provider and model. Requests route to the model reliably with retry and exponential backoff on failures.

**Rationale**: Core backend capability enabling AI responses.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-llm`

#### FR-MODEL-002 Context Management

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-context-mgmt`

The system MUST maintain conversation state across turns. The system MUST apply a context window strategy (truncation, summarization, or retrieval) to handle long conversations. Multi-turn coherence MUST be maintained in typical 20–50 turn chats.

**Rationale**: Context management is essential for coherent multi-turn conversations.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-llm`

#### FR-MODEL-003 System Instructions

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-system-prompt`

The system MUST apply a system prompt and app policy to every conversation. Policy is non-user-editable; changes are versioned.

**Rationale**: Consistent behavior and safety guardrails require controlled system instructions.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-llm`, `cpt-ai-chat-via-cyber-pilot-actor-admin`

#### FR-MODEL-004 Rate Limiting

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-rate-limiting`

The system MUST enforce per-user and per-IP rate limits. Anonymous users get stricter limits than authenticated users. Abuse MUST NOT degrade service for normal users.

**Rationale**: Prevents abuse and ensures fair resource allocation.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`, `cpt-ai-chat-via-cyber-pilot-actor-anon`

### 5.5 Safety and Moderation

#### FR-SAFE-001 Content Moderation

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-moderation`

The system MUST moderate input and output content. Disallowed content MUST be blocked or flagged. The system SHOULD provide safe completion alternatives when content is refused.

**Rationale**: Safety controls protect users and the platform from harmful content.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-moderator`, `cpt-ai-chat-via-cyber-pilot-actor-user`

#### FR-SAFE-002 User Reporting

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-reporting`

The system MUST provide a "Report" button on assistant messages. Reports capture conversation snippet and metadata and appear in admin console.

**Rationale**: User feedback helps identify moderation gaps and improve safety.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-user`, `cpt-ai-chat-via-cyber-pilot-actor-admin`

### 5.6 Admin and Observability

#### FR-ADMIN-001 Metrics Dashboard

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-dashboard`

The system MUST provide an admin dashboard showing request volume, latency, error rate, and token usage/cost estimate by day. Top users by usage shown in privacy-aware manner. Metrics updated near-real-time.

**Rationale**: Admins need visibility into system health and costs.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

#### FR-ADMIN-002 Logs and Tracing

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-logs`

The system MUST correlate UI request to backend to model provider in logs. Sensitive content redacted by default; gated access for support.

**Rationale**: Debugging and incident response require end-to-end traceability.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

#### FR-ADMIN-003 Incident Controls

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-incident-controls`

The system MUST provide a kill switch for a model or provider. The system MUST support feature flags for streaming, attachments, and other features.

**Rationale**: Rapid incident response requires ability to disable problematic features.

**Actors**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

## 6. Non-Functional Requirements

### 6.1 NFR Inclusions

#### Performance

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-nfr-performance`

The system MUST achieve P95 time-to-first-token under 2 seconds. The system MUST achieve P95 end-to-end response time under 8 seconds for short answers. Backend latency excluding model MUST be under 300ms at P95.

**Threshold**: TTFT P95 < 2s, E2E P95 < 8s, Backend P95 < 300ms

**Rationale**: Responsiveness is critical for chat user experience.

#### Availability

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-nfr-availability`

The system MUST achieve 99.5% uptime for MVP. The system MUST degrade gracefully if LLM provider is down, showing a friendly error or fallback.

**Threshold**: 99.5% uptime monthly

**Rationale**: Users expect reliable access to the service.

#### Security

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-nfr-security`

The system MUST address OWASP Top 10 vulnerabilities. The system MUST implement strong CSP, XSS protections, and CSRF protections. Secrets MUST be stored in a vault with key rotation. All traffic MUST use TLS encryption in transit. Data at rest MUST be encrypted.

**Threshold**: Zero critical/high vulnerabilities in security audit

**Rationale**: Security is foundational for user trust and data protection.

#### Scalability

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-nfr-scalability`

The system MUST support 500 concurrent active users for MVP. Error rate MUST be under 1% excluding explicit safety refusals.

**Threshold**: 500 concurrent users, <1% error rate

**Rationale**: System must handle expected user load without degradation.

### 6.2 NFR Exclusions

- **Accessibility** (UX-PRD-002): Deferred to Phase 2 — MVP focuses on core functionality; WCAG 2.1 AA compliance planned for subsequent release
- **Internationalization** (UX-PRD-003): Not applicable — English-only for initial release
- **Offline Capability** (UX-PRD-004): Not applicable — Chat requires network connectivity to LLM provider
- **Safety-Critical Operations** (SAFE-PRD-001/002): Not applicable — No physical harm potential; content safety covered under moderation requirements

## 7. Public Library Interfaces

### 7.1 Public API Surface

#### Chat API

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-interface-chat-api`

**Type**: REST API with SSE streaming

**Stability**: unstable (MVP)

**Description**: HTTP endpoints for conversation and message management with Server-Sent Events for streaming responses.

**Breaking Change Policy**: API versioning via URL path; breaking changes require version bump.

### 7.2 External Integration Contracts

#### LLM Provider Contract

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-contract-llm`

**Direction**: required from provider

**Protocol/Format**: HTTPS/REST or provider SDK

**Compatibility**: Must support streaming responses; provider API changes may require adapter updates.

## 8. Use Cases

#### UC-001 Start New Chat

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-usecase-new-chat`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Preconditions**:
- User is on the chat interface (authenticated or anonymous)

**Main Flow**:
1. User clicks "New chat" button
2. System clears current conversation from view
3. System creates new conversation with unique ID
4. System displays empty chat with input composer
5. User types message and sends
6. System routes message to LLM provider
7. System streams response token-by-token
8. System displays response as it generates

**Postconditions**:
- New conversation created and visible in sidebar (if authenticated)
- First exchange complete with streamed response

**Alternative Flows**:
- **LLM provider error**: System displays friendly error message with retry option
- **Rate limit exceeded**: System displays rate limit message with wait time

#### UC-002 Continue Conversation

- [ ] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-usecase-continue`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Preconditions**:
- User is authenticated
- User has existing conversations

**Main Flow**:
1. User clicks conversation in sidebar
2. System loads conversation history
3. System displays messages in thread
4. User types follow-up message
5. System includes conversation context in LLM request
6. System streams response with multi-turn awareness

**Postconditions**:
- Conversation updated with new exchange
- Context maintained across turns

**Alternative Flows**:
- **Context window exceeded**: System applies truncation/summarization strategy

#### UC-003 Search Conversations

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-usecase-search`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Preconditions**:
- User is authenticated
- User has conversation history

**Main Flow**:
1. User enters search query in sidebar search box
2. System searches conversation titles and message content
3. System displays matching conversations
4. User clicks result to open conversation

**Postconditions**:
- Matching conversations displayed
- Selected conversation loaded

**Alternative Flows**:
- **No results**: System displays "No conversations found" message

#### UC-004 Report Problematic Response

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-usecase-report`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-user`

**Preconditions**:
- User is viewing a conversation with assistant messages

**Main Flow**:
1. User clicks "Report" button on assistant message
2. System displays report dialog with category options
3. User selects category and optionally adds comment
4. System captures message, context, and metadata
5. System submits report to admin queue
6. System confirms report submitted

**Postconditions**:
- Report visible in admin console
- User receives confirmation

**Alternative Flows**:
- **User cancels**: Report dialog closes, no action taken

## 9. Acceptance Criteria

- [ ] Users can start a new chat, send a message, and receive a streamed answer
- [ ] Stop and regenerate functions work correctly
- [ ] Conversations are saved and appear in sidebar after page reload
- [ ] Search returns matching conversations within 1 second
- [ ] Markdown and code blocks render correctly and safely (no XSS)
- [ ] Rate limiting prevents spam without blocking normal usage
- [ ] Basic content moderation blocks disallowed content
- [ ] Admin dashboard displays latency, errors, and token usage metrics

## 10. Dependencies

| Dependency | Description | Criticality |
|------------|-------------|-------------|
| LLM Provider | AI model API for generating responses | p1 |
| Authentication Provider | OAuth provider (Google) for user login | p1 |
| Database | Persistent storage for users, conversations, messages | p1 |
| Moderation Service | Content filtering for safety | p1 |
| Metrics/Logging | Observability infrastructure | p2 |

## 11. Assumptions

- Users have modern browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled
- Users have reliable internet connectivity for real-time streaming
- LLM provider offers streaming API with acceptable latency
- Initial deployment is cloud-hosted with managed infrastructure
- Single-region deployment for MVP; multi-region considered for later phases

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM provider outage | Users cannot get responses | Implement fallback provider or graceful degradation |
| Cost overrun from token usage | Unexpected infrastructure costs | Implement hard caps per user/day; monitor usage closely |
| Abuse and spam | Service degradation, safety issues | Rate limiting, moderation, user reporting |
| Context window limitations | Poor multi-turn coherence | Implement summarization or retrieval strategies |
| Streaming complexity | Implementation bugs, poor UX | Thorough testing of SSE/WebSocket handling |
