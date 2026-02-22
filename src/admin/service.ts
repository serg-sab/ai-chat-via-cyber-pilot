// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2
// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1
// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-metrics-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-usage-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-feature-flags-endpoint:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-kill-switch-endpoint:p2

import { getPool } from '../db/pool';
import { getRedis } from '../db/redis';
import {
  Period,
  MetricsResponse,
  UsageResponse,
  FeatureFlags,
  KillSwitchStatus,
  MODEL_PRICING,
  KNOWN_FEATURE_FLAGS,
  KNOWN_MODELS,
} from './types';

const FEATURE_FLAGS_KEY = 'feature_flags';
const KILL_SWITCH_PREFIX = 'kill_switch:model:';

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-calc-start-time
function getStartTime(period: Period): Date {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-calc-start-time

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-count-requests
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-calc-percentiles
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-count-errors
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-calc-error-rate
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-return-aggregated
export async function aggregateMetrics(period: Period): Promise<MetricsResponse> {
  const pool = getPool();
  const startTime = getStartTime(period);

  // Count total requests (messages)
  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM messages WHERE created_at > $1`,
    [startTime]
  );
  const totalRequests = parseInt(totalResult.rows[0].count, 10);

  // Get requests by hour
  const byHourResult = await pool.query<{ hour: string; count: string }>(
    `SELECT date_trunc('hour', created_at) as hour, COUNT(*) as count 
     FROM messages 
     WHERE created_at > $1 
     GROUP BY date_trunc('hour', created_at) 
     ORDER BY hour`,
    [startTime]
  );
  const byHour = byHourResult.rows.map(row => ({
    hour: row.hour,
    count: parseInt(row.count, 10),
  }));

  // Calculate latency percentiles from message metadata
  const latencyResult = await pool.query<{ p50: number; p95: number; p99: number }>(
    `SELECT 
       COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY (metadata->>'latencyMs')::numeric), 0) as p50,
       COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY (metadata->>'latencyMs')::numeric), 0) as p95,
       COALESCE(percentile_cont(0.99) WITHIN GROUP (ORDER BY (metadata->>'latencyMs')::numeric), 0) as p99
     FROM messages 
     WHERE created_at > $1 AND role = 'assistant' AND metadata->>'latencyMs' IS NOT NULL`,
    [startTime]
  );
  const latency = {
    p50: Math.round(latencyResult.rows[0]?.p50 || 0),
    p95: Math.round(latencyResult.rows[0]?.p95 || 0),
    p99: Math.round(latencyResult.rows[0]?.p99 || 0),
  };

  // Count errors from moderation logs
  const errorsResult = await pool.query<{ result: string; count: string }>(
    `SELECT result, COUNT(*) as count 
     FROM moderation_logs 
     WHERE created_at > $1 AND result = 'block'
     GROUP BY result`,
    [startTime]
  );
  
  const errorsByType: Record<string, number> = {};
  let totalErrors = 0;
  for (const row of errorsResult.rows) {
    const count = parseInt(row.count, 10);
    errorsByType['MODERATION_BLOCK'] = (errorsByType['MODERATION_BLOCK'] || 0) + count;
    totalErrors += count;
  }

  const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

  return {
    period,
    requestVolume: {
      total: totalRequests,
      byHour,
    },
    latency,
    errors: {
      total: totalErrors,
      rate: Math.round(errorRate * 10000) / 10000,
      byType: errorsByType,
    },
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-return-aggregated
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-calc-error-rate
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-count-errors
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-calc-percentiles
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-aggregate-metrics:p1:inst-count-requests

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-load-pricing
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-separate-tokens
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-calc-input-cost
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-calc-output-cost
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-return-cost
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = 'gpt-4o-mini'
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
  const inputCost = (inputTokens / 1000) * pricing.inputPer1k;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1k;
  return Math.round((inputCost + outputCost) * 100) / 100;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-return-cost
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-calc-output-cost
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-calc-input-cost
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-separate-tokens
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-admin-dashboard-calculate-cost:p1:inst-load-pricing

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-request-usage
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-query-token-usage
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-calculate-cost
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-query-top-users
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-anonymize-users
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-return-usage
export async function getUsageStats(period: Period): Promise<UsageResponse> {
  const pool = getPool();
  const startTime = getStartTime(period);

  // Get token usage from assistant messages
  const tokenResult = await pool.query<{ total_tokens: string }>(
    `SELECT COALESCE(SUM((metadata->>'tokenCount')::numeric), 0) as total_tokens
     FROM messages 
     WHERE created_at > $1 AND role = 'assistant' AND metadata->>'tokenCount' IS NOT NULL`,
    [startTime]
  );
  const outputTokens = parseInt(tokenResult.rows[0].total_tokens, 10);
  
  // Estimate input tokens as roughly 0.6x output (typical ratio)
  const inputTokens = Math.round(outputTokens * 0.6);
  const totalTokens = inputTokens + outputTokens;

  // Calculate cost
  const estimatedCost = calculateCost(inputTokens, outputTokens);

  // Get top users by message count (anonymized)
  const topUsersResult = await pool.query<{ user_id: string; count: string }>(
    `SELECT c.user_id, COUNT(m.id) as count
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE m.created_at > $1
     GROUP BY c.user_id
     ORDER BY count DESC
     LIMIT 10`,
    [startTime]
  );

  const topUsers = topUsersResult.rows.map((row, index) => ({
    rank: index + 1,
    odUserId: `anon_${row.user_id.substring(0, 8)}`,
    messageCount: parseInt(row.count, 10),
  }));

  return {
    period,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
    },
    cost: {
      estimated: estimatedCost,
      currency: 'USD',
    },
    topUsers,
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-return-usage
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-anonymize-users
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-query-top-users
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-calculate-cost
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-query-token-usage
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-request-usage

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-get-flags
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-redis-get-flags
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-return-flags
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const redis = getRedis();
  const flags = await redis.hgetall(FEATURE_FLAGS_KEY);
  
  // Return defaults merged with stored values
  const result: FeatureFlags = {
    moderation_enabled: true,
    streaming_enabled: true,
    new_model_enabled: false,
  };
  
  for (const [key, value] of Object.entries(flags)) {
    result[key] = value === 'true';
  }
  
  return result;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-return-flags
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-redis-get-flags
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-get-flags

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-submit-flag-change
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-validate-flag-name
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-redis-set-flag
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-log-flag-change
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-return-updated-flags
export async function setFeatureFlag(
  flag: string,
  enabled: boolean,
  adminId: string
): Promise<FeatureFlags> {
  if (!KNOWN_FEATURE_FLAGS.includes(flag)) {
    throw new Error(`Unknown feature flag: ${flag}`);
  }
  
  const redis = getRedis();
  await redis.hset(FEATURE_FLAGS_KEY, flag, enabled.toString());
  
  // Log the change
  console.log(`[AUDIT] Admin ${adminId} set feature flag ${flag} to ${enabled}`);
  
  return getFeatureFlags();
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-return-updated-flags
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-log-flag-change
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-redis-set-flag
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-validate-flag-name
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-submit-flag-change

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-submit-kill-switch
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-validate-model-name
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-redis-set-kill
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-log-kill-switch
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-return-kill-status
export async function setKillSwitch(
  model: string,
  enabled: boolean,
  adminId: string
): Promise<KillSwitchStatus> {
  if (!KNOWN_MODELS.includes(model)) {
    throw new Error(`Unknown model: ${model}`);
  }
  
  const redis = getRedis();
  const key = `${KILL_SWITCH_PREFIX}${model}`;
  const now = new Date().toISOString();
  
  await redis.set(key, JSON.stringify({ enabled, updatedAt: now }));
  
  // Log the change
  console.log(`[AUDIT] Admin ${adminId} set kill switch for ${model} to ${enabled}`);
  
  return {
    model,
    enabled,
    updatedAt: now,
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-return-kill-status
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-log-kill-switch
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-redis-set-kill
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-validate-model-name
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-submit-kill-switch

export async function getKillSwitchStatus(model: string): Promise<KillSwitchStatus | null> {
  const redis = getRedis();
  const key = `${KILL_SWITCH_PREFIX}${model}`;
  const data = await redis.get(key);
  
  if (!data) {
    return null;
  }
  
  const parsed = JSON.parse(data);
  return {
    model,
    enabled: parsed.enabled,
    updatedAt: parsed.updatedAt,
  };
}

export async function isModelEnabled(model: string): Promise<boolean> {
  const status = await getKillSwitchStatus(model);
  return status === null || status.enabled;
}

export { KNOWN_FEATURE_FLAGS, KNOWN_MODELS };
