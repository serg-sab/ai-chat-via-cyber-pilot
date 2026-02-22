// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1
// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-input-middleware:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-output-filter:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-logging:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-safety-flags:p1

import OpenAI from 'openai';
import { getPool } from '../db/pool';
import {
  ModerationCheckResult,
  ModerationCategory,
  ModerationResult,
  ModerationError,
  Report,
  ReportPublic,
  ReportStatus,
} from './types';

const MODERATION_ENABLED = process.env.MODERATION_ENABLED !== 'false';
const BLOCK_THRESHOLD = parseFloat(process.env.MODERATION_BLOCK_THRESHOLD || '0.8');
const FLAG_THRESHOLD = parseFloat(process.env.MODERATION_FLAG_THRESHOLD || '0.5');

const FALLBACK_MESSAGE = "I apologize, but I cannot provide that response as it may violate our content policies. Please try rephrasing your request.";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-check-enabled
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-try-openai-moderation
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-catch-moderation-error
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-graceful-fallback
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-extract-categories
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-check-block-threshold
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-check-flag-threshold
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-result-pass
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-return-safety-result
export async function checkContentSafety(
  content: string,
  contentType: 'input' | 'output'
): Promise<ModerationCheckResult> {
  // Check if moderation is enabled
  if (!MODERATION_ENABLED) {
    return {
      result: 'pass',
      categories: [],
      scores: {} as Record<ModerationCategory, number>,
    };
  }

  try {
    const client = getOpenAIClient();
    const response = await client.moderations.create({
      input: content,
    });

    const result = response.results[0];
    const categories: ModerationCategory[] = [];
    const scores: Record<ModerationCategory, number> = {
      hate: 0,
      harassment: 0,
      'self-harm': 0,
      sexual: 0,
      violence: 0,
    };

    // Map OpenAI categories to our categories
    const categoryMapping: Record<string, ModerationCategory> = {
      'hate': 'hate',
      'hate/threatening': 'hate',
      'harassment': 'harassment',
      'harassment/threatening': 'harassment',
      'self-harm': 'self-harm',
      'self-harm/intent': 'self-harm',
      'self-harm/instructions': 'self-harm',
      'sexual': 'sexual',
      'sexual/minors': 'sexual',
      'violence': 'violence',
      'violence/graphic': 'violence',
    };

    // Extract scores and flagged categories
    for (const [key, value] of Object.entries(result.category_scores)) {
      const mappedCategory = categoryMapping[key];
      if (mappedCategory) {
        const score = value as number;
        if (score > scores[mappedCategory]) {
          scores[mappedCategory] = score;
        }
        if (score > FLAG_THRESHOLD && !categories.includes(mappedCategory)) {
          categories.push(mappedCategory);
        }
      }
    }

    // Determine result based on thresholds
    let moderationResult: ModerationResult = 'pass';
    
    for (const category of categories) {
      if (scores[category] >= BLOCK_THRESHOLD) {
        moderationResult = 'block';
        break;
      }
      if (scores[category] >= FLAG_THRESHOLD) {
        moderationResult = 'flag';
      }
    }

    return {
      result: moderationResult,
      categories,
      scores,
    };
  } catch (err: unknown) {
    // Graceful degradation - log error and allow content through
    console.error('Moderation API error:', err);
    return {
      result: 'pass',
      categories: [],
      scores: {} as Record<ModerationCategory, number>,
    };
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-return-safety-result
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-result-pass
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-check-flag-threshold
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-check-block-threshold
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-extract-categories
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-graceful-fallback
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-catch-moderation-error
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-try-openai-moderation
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-check-safety:p1:inst-check-enabled

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2:inst-build-log-entry
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2:inst-include-result
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2:inst-insert-log
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2:inst-return-log-id
export async function logModerationEvent(
  eventType: 'input_check' | 'output_check' | 'report' | 'resolution',
  userId: string,
  messageId: string | null,
  result: ModerationResult | null,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const pool = getPool();
  
  const logResult = await pool.query<{ id: string }>(
    `INSERT INTO moderation_logs (event_type, user_id, message_id, result, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
     RETURNING id`,
    [eventType, userId, messageId, result, JSON.stringify(metadata)]
  );
  
  return logResult.rows[0].id;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2:inst-return-log-id
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2:inst-insert-log
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2:inst-include-result
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-content-moderation-log-event:p2:inst-build-log-entry

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-receive-input
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-check-input-safety
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-block-input
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-flag-input
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-log-input-event
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-return-input-result
export async function moderateInput(
  content: string,
  userId: string
): Promise<{ content: string; safetyFlags: ModerationCategory[] }> {
  const checkResult = await checkContentSafety(content, 'input');
  
  // Log the moderation event
  await logModerationEvent('input_check', userId, null, checkResult.result, {
    categories: checkResult.categories,
    scores: checkResult.scores,
  });
  
  if (checkResult.result === 'block') {
    throw new ModerationError(
      `Content blocked due to policy violation: ${checkResult.categories.join(', ')}`,
      400,
      checkResult.categories
    );
  }
  
  return {
    content,
    safetyFlags: checkResult.categories,
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-return-input-result
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-log-input-event
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-flag-input
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-block-input
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-check-input-safety
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-input:p1:inst-receive-input

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-receive-output
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-check-output-safety
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-replace-blocked-output
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-flag-output
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-log-output-event
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-return-output-result
export async function moderateOutput(
  content: string,
  userId: string,
  messageId: string | null
): Promise<{ content: string; safetyFlags: ModerationCategory[]; wasBlocked: boolean }> {
  const checkResult = await checkContentSafety(content, 'output');
  
  // Log the moderation event
  await logModerationEvent('output_check', userId, messageId, checkResult.result, {
    categories: checkResult.categories,
    scores: checkResult.scores,
  });
  
  if (checkResult.result === 'block') {
    return {
      content: FALLBACK_MESSAGE,
      safetyFlags: checkResult.categories,
      wasBlocked: true,
    };
  }
  
  return {
    content,
    safetyFlags: checkResult.categories,
    wasBlocked: false,
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-return-output-result
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-log-output-event
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-flag-output
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-replace-blocked-output
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-check-output-safety
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-output:p1:inst-receive-output

function toReportPublic(report: Report): ReportPublic {
  return {
    id: report.id,
    messageId: report.messageId,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() || null,
  };
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-submit-report
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-fetch-message
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-message-not-found
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-validate-ownership
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-check-existing-report
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-already-reported
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-create-report
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-log-report-event
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-return-report-created
export async function createReport(
  messageId: string,
  userId: string,
  reason: string | null
): Promise<ReportPublic> {
  const pool = getPool();
  
  // Check if message exists
  const messageResult = await pool.query<{ conversation_id: string }>(
    `SELECT conversation_id FROM messages WHERE id = $1`,
    [messageId]
  );
  
  if (messageResult.rows.length === 0) {
    throw new ModerationError('Message not found', 404);
  }
  
  // Validate user owns the conversation
  const conversationResult = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM conversations WHERE id = $1`,
    [messageResult.rows[0].conversation_id]
  );
  
  if (conversationResult.rows.length === 0 || conversationResult.rows[0].user_id !== userId) {
    throw new ModerationError('Access denied', 403);
  }
  
  // Check if already reported by this user
  const existingReport = await pool.query(
    `SELECT id FROM reports WHERE message_id = $1 AND user_id = $2`,
    [messageId, userId]
  );
  
  if (existingReport.rows.length > 0) {
    throw new ModerationError('Message already reported', 409);
  }
  
  // Create report
  const reportResult = await pool.query<Report>(
    `INSERT INTO reports (message_id, user_id, reason, status, created_at)
     VALUES ($1, $2, $3, 'pending', NOW())
     RETURNING id, message_id as "messageId", user_id as "userId", reason, status, 
               created_at as "createdAt", resolved_at as "resolvedAt", resolved_by as "resolvedBy"`,
    [messageId, userId, reason]
  );
  
  const report = reportResult.rows[0];
  
  // Log the report event
  await logModerationEvent('report', userId, messageId, null, { reason });
  
  return toReportPublic(report);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-return-report-created
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-log-report-event
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-create-report
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-already-reported
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-check-existing-report
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-validate-ownership
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-message-not-found
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-fetch-message
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-submit-report

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-request-reports
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-fetch-pending-reports
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-return-reports
export async function listPendingReports(
  limit: number = 20,
  offset: number = 0
): Promise<{ reports: ReportPublic[]; total: number }> {
  const pool = getPool();
  
  const reportsResult = await pool.query<Report>(
    `SELECT id, message_id as "messageId", user_id as "userId", reason, status,
            created_at as "createdAt", resolved_at as "resolvedAt", resolved_by as "resolvedBy"
     FROM reports 
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM reports WHERE status = 'pending'`
  );
  
  return {
    reports: reportsResult.rows.map(toReportPublic),
    total: parseInt(countResult.rows[0].count, 10),
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-return-reports
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-fetch-pending-reports
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-request-reports

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-submit-resolution
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-update-report
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-log-resolution
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-return-resolved
export async function resolveReport(
  reportId: string,
  adminId: string,
  status: 'dismissed' | 'action_taken',
  notes?: string
): Promise<ReportPublic> {
  const pool = getPool();
  
  const result = await pool.query<Report>(
    `UPDATE reports 
     SET status = $1, resolved_by = $2, resolved_at = NOW()
     WHERE id = $3
     RETURNING id, message_id as "messageId", user_id as "userId", reason, status,
               created_at as "createdAt", resolved_at as "resolvedAt", resolved_by as "resolvedBy"`,
    [status, adminId, reportId]
  );
  
  if (result.rows.length === 0) {
    throw new ModerationError('Report not found', 404);
  }
  
  const report = result.rows[0];
  
  // Log the resolution
  await logModerationEvent('resolution', adminId, report.messageId, null, {
    reportId,
    status,
    notes,
  });
  
  return toReportPublic(report);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-return-resolved
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-log-resolution
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-update-report
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-submit-resolution

export { FALLBACK_MESSAGE, MODERATION_ENABLED, BLOCK_THRESHOLD, FLAG_THRESHOLD };
