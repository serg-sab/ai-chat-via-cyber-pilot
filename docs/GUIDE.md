# Building AI Chat with Cypilot: A Step-by-Step Guide

This guide documents how the AI Chat application was built using **Cypilot** — a specification-driven development (SDD) methodology that ensures traceability from requirements to code.

## Overview

The AI Chat application was developed in phases:

1. **Design Phase** — Create PRD, DESIGN, and DECOMPOSITION artifacts
2. **Feature Specification** — Break down into 6 feature specs
3. **Implementation** — Build backend and frontend with traceability markers
4. **Validation** — Use Cypilot to verify consistency
5. **Testing** — Add comprehensive test coverage

## Phase 1: Project Setup with Cypilot

### Initialize Cypilot Adapter

```bash
# git submodule
git submodule add https://github.com/cyberfabric/cyber-pilot cypilot
git submodule update --init --recursive

# Agent-safe invocation
python cypilot/skills/cypilot/scripts/cypilot.py init
python cypilot/skills/cypilot/scripts/cypilot.py agents --agent windsurf
```

This creates:
- `.cypilot-adapter/` — Project-specific configuration
- `.cypilot-adapter/artifacts.json` — Registry of all artifacts
- `.cypilot-adapter/AGENTS.md` — AI agent navigation rules

### Define Artifacts Registry

The `artifacts.json` registers all design documents:

```json
{
  "systems": [{
    "name": "ai-chat-via-cyber-pilot",
    "kit": "cypilot-sdlc",
    "artifacts": [
      { "path": "docs/PRD.md", "kind": "PRD" },
      { "path": "docs/DESIGN.md", "kind": "DESIGN" },
      { "path": "docs/DECOMPOSITION.md", "kind": "DECOMPOSITION" },
      { "path": "docs/features/database-foundation.md", "kind": "FEATURE" },
      { "path": "docs/features/user-auth.md", "kind": "FEATURE" },
      { "path": "docs/features/conversation-mgmt.md", "kind": "FEATURE" },
      { "path": "docs/features/chat-core.md", "kind": "FEATURE" },
      { "path": "docs/features/content-moderation.md", "kind": "FEATURE" },
      { "path": "docs/features/admin-dashboard.md", "kind": "FEATURE" }
    ]
  }]
}
```

## Phase 2: Create Design Artifacts

### Start with an Initial Prompt

Enable Cypilot mode:

```bash
cypilot on
```

The project began with a detailed requirements document describing the AI chat application. See [initial-prompt.txt](initial-prompt.txt) for the full prompt that was used to bootstrap the project.

The initial prompt covered:
- Product scope and goals
- Personas and use cases
- Functional requirements (chat, history, auth, moderation, admin)
- UX/UI requirements
- Non-functional requirements (performance, security, privacy)
- Data model
- API requirements
- Quality and acceptance testing
- Phased delivery plan

### PRD (Product Requirements Document)

Using the initial prompt, Cypilot generates a structured PRD:

```bash
cypilot generate PRD
```

The PRD defines:
- **Actors**: User, Anonymous, Admin, LLM Provider, Moderator
- **Functional Requirements**: 22 FRs covering chat, auth, history, moderation
- **Non-Functional Requirements**: Performance, availability, security, scalability
- **Use Cases**: New chat, continue conversation, search, report

Each requirement gets a unique ID:
```markdown
- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-fr-streaming`
```

### DESIGN (Technical Design)

```bash
cypilot generate DESIGN
```

The DESIGN maps requirements to architecture:
- **Architecture Drivers** — Links FRs/NFRs to design decisions
- **Components** — 7 components (Chat UI, API Gateway, services)
- **Database Schema** — Users, conversations, messages tables
- **Sequence Diagrams** — Send message flow, auth flow

### DECOMPOSITION (Feature Breakdown)

```bash
cypilot generate DECOMPOSITION
```

Breaks the project into 6 implementable features with dependencies:

```
1. Database Foundation (no deps)
2. User Authentication (depends on 1)
3. Conversation Management (depends on 1, 2)
4. Chat Core (depends on 1, 2, 3)
5. Content Moderation (depends on 4)
6. Admin Dashboard (depends on 1, 2, 5)
```

## Phase 3: Feature Specifications

For each feature, create a detailed spec:

```bash
cypilot generate FEATURE database-foundation
cypilot generate FEATURE user-auth
cypilot generate FEATURE conversation-mgmt
cypilot generate FEATURE chat-core
cypilot generate FEATURE content-moderation
cypilot generate FEATURE admin-dashboard
```

Each FEATURE spec contains:
- **Flows** — Step-by-step user/system interactions
- **Algorithms** — Business logic with pseudocode
- **States** — State machines for entities
- **Definition of Done** — Acceptance criteria

Example flow with steps:
```markdown
### Send Message Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message`

**Steps**:
1. [x] - User submits message - `inst-submit-message`
2. [x] - Validate conversation ownership - `inst-validate-ownership`
3. [x] - Check rate limit - `inst-check-rate-limit`
4. [x] - Save user message - `inst-save-user-message`
5. [x] - Build context - `inst-build-context`
6. [x] - Stream LLM response - `inst-stream-llm`
```

## Phase 4: Implementation with Traceability

### Code Markers

Every code file links back to design IDs using `@cpt-*` markers:

```typescript
// src/chat/service.ts

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-send-message-endpoint:p1

export async function sendMessage(...) {
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-validate-ownership
  await validateConversationOwnership(conversationId, userId);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-validate-ownership
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-check-rate-limit
  const rateLimitResult = await enforceRateLimit(userId, ip);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1:inst-check-rate-limit
  
  // ... more implementation
}
```

### Marker Types

| Marker | Purpose |
|--------|---------|
| `@cpt-flow:ID:priority` | Links to a flow definition |
| `@cpt-algo:ID:priority` | Links to an algorithm |
| `@cpt-dod:ID:priority` | Links to a Definition of Done |
| `@cpt-begin:ID:priority:step` | Start of a specific step |
| `@cpt-end:ID:priority:step` | End of a specific step |

### Implementation Order

Follow the dependency order from DECOMPOSITION:

1. **Database Foundation** — `src/db/pool.ts`, `src/db/redis.ts`, migrations
2. **User Auth** — `src/auth/service.ts`, `src/auth/routes.ts`, JWT, sessions
3. **Conversation Mgmt** — `src/conversations/service.ts`, CRUD endpoints
4. **Chat Core** — `src/chat/service.ts`, streaming, context management
5. **Content Moderation** — `src/moderation/service.ts`, OpenAI moderation API
6. **Admin Dashboard** — `src/admin/service.ts`, metrics, feature flags

## Phase 5: Validation with Cypilot

### Run Validation

```bash
cypilot analyze
```

Cypilot checks:
- ✅ All checkboxes consistent (parent/child, refs/defs)
- ✅ All FRs referenced in DESIGN
- ✅ All components/tables marked complete
- ✅ Cross-references valid

### Check Traceability

```bash
cypilot list-ids                    # List all 188 design IDs
cypilot where-used --id <id>        # Find code implementing an ID
cypilot where-defined --id <id>     # Find where ID is defined
```

### Traceability Stats

| Metric | Count |
|--------|-------|
| Total `@cpt-*` markers | 674 |
| Unique IDs traced | 74 |
| Flows implemented | 18 |
| Algorithms implemented | 17 |
| DoD items implemented | 32 |

## Phase 6: Testing

### Set Up Jest

```bash
npm install --save-dev jest ts-jest @types/jest
```

### Create Tests for Each Feature

```
src/__tests__/
├── setup.ts                    # Global test setup
├── auth/
│   ├── password.test.ts        # Password hashing/validation
│   ├── jwt.test.ts             # JWT generation/validation
│   └── service.test.ts         # Register/login flows
├── conversations/
│   └── service.test.ts         # CRUD operations
├── chat/
│   └── service.test.ts         # Context/token counting
├── moderation/
│   └── service.test.ts         # Reports/safety checks
├── admin/
│   └── service.test.ts         # Metrics/flags/kill switch
└── db/
    └── pool.test.ts            # Database pool
```

### Run Tests

```bash
npm test
# 54 tests passing across 8 test suites
```

## Key Takeaways

### Benefits of Cypilot SDD

1. **Traceability** — Every line of code links to a design decision
2. **Consistency** — Automated validation catches documentation drift
3. **Onboarding** — New developers can trace any code to its purpose
4. **Maintenance** — Changes can be validated against requirements
5. **Completeness** — Checkboxes track implementation progress

### Workflow Summary

```
PRD → DESIGN → DECOMPOSITION → FEATURE specs → Code with @cpt markers → Tests
         ↓           ↓              ↓                    ↓
    cypilot      cypilot        cypilot              cypilot
    generate     generate       generate             analyze
```

### Commands Reference

| Command | Purpose |
|---------|---------|
| `cypilot init` | Initialize adapter for project |
| `cypilot generate <KIND>` | Create/update artifact |
| `cypilot analyze` | Validate all artifacts |
| `cypilot list-ids` | List all design IDs |
| `cypilot where-used --id <id>` | Find code for ID |
| `cypilot where-defined --id <id>` | Find definition of ID |

## Project Structure

```
ai-chat-via-cyber-pilot/
├── docs/
│   ├── PRD.md                  # Product requirements
│   ├── DESIGN.md               # Technical design
│   ├── DECOMPOSITION.md        # Feature breakdown
│   └── features/               # 6 feature specs
├── src/                        # Backend (Node.js/Express)
│   ├── auth/                   # Authentication
│   ├── chat/                   # Chat core
│   ├── conversations/          # Conversation management
│   ├── moderation/             # Content moderation
│   ├── admin/                  # Admin dashboard
│   └── db/                     # Database layer
├── web/                        # Frontend (React/Vite)
├── cypilot/                    # Cypilot core (submodule)
└── .cypilot-adapter/           # Project adapter
```

## Conclusion

Using Cypilot, the AI Chat application was built with:
- **9 design artifacts** (PRD, DESIGN, DECOMPOSITION, 6 features)
- **188 traceable IDs** across all artifacts
- **674 code markers** linking implementation to design
- **54 automated tests** covering all features
- **100% validation pass** on all artifacts

The specification-driven approach ensures that every feature is designed before implementation, every implementation is traceable to requirements, and every change can be validated against the design.
