-- @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-report-endpoint:p2
-- @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-logging:p2

-- Reports table for user-submitted content reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'dismissed', 'action_taken')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_message_id ON reports(message_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Unique constraint: one report per user per message
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_user_message ON reports(user_id, message_id);

-- Moderation logs table for audit trail
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('input_check', 'output_check', 'report', 'resolution')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  result VARCHAR(10) CHECK (result IN ('pass', 'flag', 'block') OR result IS NULL),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for moderation logs
CREATE INDEX IF NOT EXISTS idx_moderation_logs_event_type ON moderation_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_id ON moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_message_id ON moderation_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON moderation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_result ON moderation_logs(result);
