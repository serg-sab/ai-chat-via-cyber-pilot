// Admin module type definitions
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-metrics-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-usage-endpoint:p1

export type Period = '24h' | '7d' | '30d';

export interface MetricsResponse {
  period: Period;
  requestVolume: {
    total: number;
    byHour: { hour: string; count: number }[];
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
}

export interface UsageResponse {
  period: Period;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    estimated: number;
    currency: string;
  };
  topUsers: {
    rank: number;
    odUserId: string;
    messageCount: number;
  }[];
}

export interface FeatureFlags {
  moderation_enabled: boolean;
  streaming_enabled: boolean;
  new_model_enabled: boolean;
  [key: string]: boolean;
}

export interface FeatureFlagUpdate {
  flag: string;
  enabled: boolean;
}

export interface KillSwitchUpdate {
  model: string;
  enabled: boolean;
}

export interface KillSwitchStatus {
  model: string;
  enabled: boolean;
  updatedAt: string;
}

export interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'gpt-4o': { inputPer1k: 0.005, outputPer1k: 0.015 },
};

export const KNOWN_FEATURE_FLAGS = [
  'moderation_enabled',
  'streaming_enabled',
  'new_model_enabled',
];

export const KNOWN_MODELS = ['gpt-4o-mini', 'gpt-4o'];
