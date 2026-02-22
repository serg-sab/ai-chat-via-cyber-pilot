# Feature: Admin Dashboard

- [ ] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-featstatus-admin-dashboard`

## 1. Feature Context

- [ ] `p2` - `cpt-ai-chat-via-cyber-pilot-feature-admin-dashboard`

### 1.1 Overview

Provide admin visibility into system health, usage metrics, costs, and user reports. Enable incident response controls including kill switches and feature flags.

### 1.2 Purpose

This feature provides operational visibility and control for administrators to monitor system health and respond to incidents.

**Problem**: Admins need visibility into system usage, costs, and the ability to respond to incidents quickly.

**Primary value**: Enables proactive monitoring, cost management, and rapid incident response.

**Key assumptions**: Chat core and content moderation are in place. Metrics are collected from existing operations.

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-ai-chat-via-cyber-pilot-actor-admin` | Views metrics, manages flags, responds to incidents |

### 1.4 References

- **PRD**: [PRD.md](../PRD.md)
- **Design**: [DESIGN.md](../DESIGN.md)
- **Dependencies**: `cpt-ai-chat-via-cyber-pilot-feature-chat-core`, `cpt-ai-chat-via-cyber-pilot-feature-content-moderation`

## 2. Actor Flows (CDSL)

### View Metrics Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

**Success Scenarios**:
- Admin views request volume over time
- Admin views latency percentiles (P50, P95, P99)
- Admin views error rates by type

**Error Scenarios**:
- Unauthorized — return 401
- Not admin — return 403

**Steps**:
1. [x] - `p1` - Admin requests GET /api/v1/admin/metrics?period=24h - `inst-request-metrics`
2. [x] - `p1` - Validate admin role - `inst-validate-admin-metrics`
3. [x] - `p1` - Algorithm: aggregate metrics using `cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics` - `inst-aggregate-metrics`
4. [x] - `p1` - **RETURN** metrics object with volume, latency, errors - `inst-return-metrics`

### View Usage Stats Flow

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

**Success Scenarios**:
- Admin views total token usage
- Admin views estimated costs
- Admin views top users by usage (anonymized)

**Error Scenarios**:
- Unauthorized — return 401
- Not admin — return 403

**Steps**:
1. [x] - `p1` - Admin requests GET /api/v1/admin/usage?period=7d - `inst-request-usage`
2. [x] - `p1` - Validate admin role - `inst-validate-admin-usage`
3. [x] - `p1` - DB: SELECT SUM(metadata->>'tokenCount') FROM messages WHERE created_at > :start - `inst-query-token-usage`
4. [x] - `p1` - Algorithm: calculate cost estimates using `cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost` - `inst-calculate-cost`
5. [x] - `p1` - DB: SELECT user_id, COUNT(*) FROM messages GROUP BY user_id ORDER BY COUNT DESC LIMIT 10 - `inst-query-top-users`
6. [x] - `p1` - Anonymize user IDs for privacy - `inst-anonymize-users`
7. [x] - `p1` - **RETURN** usage stats object - `inst-return-usage`

### Manage Feature Flags Flow

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

**Success Scenarios**:
- Admin views current feature flags
- Admin toggles a feature flag
- Changes take effect immediately

**Error Scenarios**:
- Unauthorized — return 401
- Not admin — return 403
- Invalid flag name — return 400

**Steps**:
1. [x] - `p2` - Admin requests GET /api/v1/admin/feature-flags - `inst-get-flags`
2. [x] - `p2` - Validate admin role - `inst-validate-admin-flags`
3. [x] - `p2` - REDIS: GET feature_flags - `inst-redis-get-flags`
4. [x] - `p2` - **RETURN** current flags object - `inst-return-flags`
5. [x] - `p2` - Admin submits POST /api/v1/admin/feature-flags with { flag, enabled } - `inst-submit-flag-change`
6. [x] - `p2` - Validate flag name is known - `inst-validate-flag-name`
7. [x] - `p2` - REDIS: HSET feature_flags :flag :enabled - `inst-redis-set-flag`
8. [x] - `p2` - Log flag change for audit - `inst-log-flag-change`
9. [x] - `p2` - **RETURN** updated flags object - `inst-return-updated-flags`

### Activate Kill Switch Flow

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch`

**Actor**: `cpt-ai-chat-via-cyber-pilot-actor-admin`

**Success Scenarios**:
- Admin disables a model/provider
- All new requests to that model fail gracefully
- Admin re-enables the model

**Error Scenarios**:
- Unauthorized — return 401
- Not admin — return 403
- Invalid model name — return 400

**Steps**:
1. [x] - `p2` - Admin submits POST /api/v1/admin/kill-switch with { model, enabled } - `inst-submit-kill-switch`
2. [x] - `p2` - Validate admin role - `inst-validate-admin-kill`
3. [x] - `p2` - Validate model name is known - `inst-validate-model-name`
4. [x] - `p2` - REDIS: SET kill_switch:model:{model} :enabled - `inst-redis-set-kill`
5. [x] - `p2` - Log kill switch change for audit - `inst-log-kill-switch`
6. [x] - `p2` - **RETURN** kill switch status - `inst-return-kill-status`

## 3. Processes / Business Logic (CDSL)

### Aggregate Metrics

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics`

**Input**: Period (24h, 7d, 30d)

**Output**: { requestVolume, latencyPercentiles, errorRates }

**Steps**:
1. [x] - `p1` - Calculate start timestamp from period - `inst-calc-start-time`
2. [x] - `p1` - DB: SELECT COUNT(*) FROM messages WHERE created_at > :start - `inst-count-requests`
3. [x] - `p1` - DB: SELECT percentile_cont(0.5, 0.95, 0.99) FROM message_latencies WHERE created_at > :start - `inst-calc-percentiles`
4. [x] - `p1` - DB: SELECT error_type, COUNT(*) FROM error_logs WHERE created_at > :start GROUP BY error_type - `inst-count-errors`
5. [x] - `p1` - Calculate error rate = errors / total requests - `inst-calc-error-rate`
6. [x] - `p1` - **RETURN** aggregated metrics object - `inst-return-aggregated`

### Calculate Cost Estimates

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost`

**Input**: Total tokens, model name

**Output**: Estimated cost in USD

**Steps**:
1. [x] - `p1` - Load pricing config for model - `inst-load-pricing`
2. [x] - `p1` - Separate input tokens and output tokens - `inst-separate-tokens`
3. [x] - `p1` - Calculate input cost = input_tokens * input_price_per_1k / 1000 - `inst-calc-input-cost`
4. [x] - `p1` - Calculate output cost = output_tokens * output_price_per_1k / 1000 - `inst-calc-output-cost`
5. [x] - `p1` - **RETURN** total cost estimate - `inst-return-cost`

## 4. States (CDSL)

### Kill Switch State

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-state-kill-switch`

```
[Active] --disable--> [Disabled] --enable--> [Active]
```

**States**:
- **Active**: Model/provider is operational, requests are processed
- **Disabled**: Model/provider is disabled, requests fail gracefully with fallback message

**Transitions**:
- `disable`: Active → Disabled (admin activates kill switch)
- `enable`: Disabled → Active (admin deactivates kill switch)

## 5. Definitions of Done

### Metrics Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-metrics-endpoint`

The system **MUST** expose GET /api/v1/admin/metrics that returns request volume, latency percentiles, and error rates for the specified period.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics`
- `cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics`

**Touches**:
- API: GET /api/v1/admin/metrics
- DB: messages table, moderation_logs table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-dashboard`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-api-gateway`

### Usage Stats Endpoint

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-usage-endpoint`

The system **MUST** expose GET /api/v1/admin/usage that returns token usage, cost estimates, and top users (anonymized) for the specified period.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage`
- `cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost`

**Touches**:
- API: GET /api/v1/admin/usage
- DB: messages table

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-dashboard`
- `cpt-ai-chat-via-cyber-pilot-fr-logs`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-api-gateway`

### Feature Flags Endpoint

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-feature-flags-endpoint`

The system **MUST** expose GET/POST /api/v1/admin/feature-flags that allows admins to view and toggle feature flags.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags`

**Touches**:
- API: GET/POST /api/v1/admin/feature-flags
- Redis: feature_flags hash

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-incident-controls`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-api-gateway`

### Kill Switch Endpoint

- [x] `p2` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-kill-switch-endpoint`

The system **MUST** expose POST /api/v1/admin/kill-switch that allows admins to disable/enable models or providers.

**Implements**:
- `cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch`

**Touches**:
- API: POST /api/v1/admin/kill-switch
- Redis: kill_switch keys

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-incident-controls`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-api-gateway`

### Admin Authentication

- [x] `p1` - **ID**: `cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-auth`

The system **MUST** restrict all admin endpoints to users with admin role, returning 403 for non-admin users.

**Implements**:
- All admin flows

**Touches**:
- API: All /api/v1/admin/* endpoints
- Auth: JWT role claim

**Covers (PRD)**:
- `cpt-ai-chat-via-cyber-pilot-fr-dashboard`

**Covers (DESIGN)**:
- `cpt-ai-chat-via-cyber-pilot-component-api-gateway`

## 6. Acceptance Criteria

- [ ] GET /api/v1/admin/metrics returns request volume, latency P50/P95/P99, error rates
- [ ] GET /api/v1/admin/usage returns token counts, cost estimates, top 10 users (anonymized)
- [ ] GET /api/v1/admin/feature-flags returns current flag states
- [ ] POST /api/v1/admin/feature-flags toggles specified flag
- [ ] POST /api/v1/admin/kill-switch disables/enables specified model
- [ ] All admin endpoints return 403 for non-admin users
- [ ] Metrics support period parameter (24h, 7d, 30d)
- [ ] Kill switch changes take effect immediately for new requests

## 7. Additional Context

### API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /api/v1/admin/metrics | View system metrics | Admin |
| GET | /api/v1/admin/usage | View usage stats | Admin |
| GET | /api/v1/admin/feature-flags | List feature flags | Admin |
| POST | /api/v1/admin/feature-flags | Toggle feature flag | Admin |
| POST | /api/v1/admin/kill-switch | Enable/disable model | Admin |

### Query Parameters

| Endpoint | Parameter | Type | Default | Description |
|----------|-----------|------|---------|-------------|
| GET /metrics | period | string | 24h | Time period (24h, 7d, 30d) |
| GET /usage | period | string | 7d | Time period (24h, 7d, 30d) |

### Metrics Response

```json
{
  "period": "24h",
  "requestVolume": {
    "total": 15000,
    "byHour": [...]
  },
  "latency": {
    "p50": 450,
    "p95": 1200,
    "p99": 2500
  },
  "errors": {
    "total": 150,
    "rate": 0.01,
    "byType": {
      "LLM_ERROR": 100,
      "RATE_LIMIT": 30,
      "MODERATION_BLOCK": 20
    }
  }
}
```

### Usage Response

```json
{
  "period": "7d",
  "tokens": {
    "input": 5000000,
    "output": 3000000,
    "total": 8000000
  },
  "cost": {
    "estimated": 12.50,
    "currency": "USD"
  },
  "topUsers": [
    { "rank": 1, "userId": "anon_abc123", "messageCount": 500 },
    { "rank": 2, "userId": "anon_def456", "messageCount": 350 }
  ]
}
```

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `moderation_enabled` | Enable content moderation | true |
| `streaming_enabled` | Enable SSE streaming | true |
| `new_model_enabled` | Enable new model rollout | false |

### Model Pricing (per 1K tokens)

| Model | Input | Output |
|-------|-------|--------|
| gpt-4o-mini | $0.00015 | $0.0006 |
| gpt-4o | $0.005 | $0.015 |
