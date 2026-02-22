// Moderation module type definitions
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-input-middleware:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-output-filter:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-safety-flags:p1

export type ModerationResult = 'pass' | 'flag' | 'block';

export type ModerationCategory = 
  | 'hate'
  | 'harassment'
  | 'self-harm'
  | 'sexual'
  | 'violence';

export interface ModerationCheckResult {
  result: ModerationResult;
  categories: ModerationCategory[];
  scores: Record<ModerationCategory, number>;
}

export interface ModerationLogEntry {
  id: string;
  eventType: 'input_check' | 'output_check' | 'report' | 'resolution';
  messageId: string | null;
  userId: string;
  result: ModerationResult | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type ReportStatus = 'pending' | 'under_review' | 'dismissed' | 'action_taken';

export interface Report {
  id: string;
  messageId: string;
  userId: string;
  reason: string | null;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export interface ReportPublic {
  id: string;
  messageId: string;
  reason: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateReportInput {
  reason?: string;
}

export interface ResolveReportInput {
  status: 'dismissed' | 'action_taken';
  notes?: string;
}

export class ModerationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public categories: ModerationCategory[] = []
  ) {
    super(message);
    this.name = 'ModerationError';
  }
}
