// Admin module exports
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-metrics-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-usage-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-feature-flags-endpoint:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-kill-switch-endpoint:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-auth:p1

export {
  aggregateMetrics,
  getUsageStats,
  calculateCost,
  getFeatureFlags,
  setFeatureFlag,
  setKillSwitch,
  getKillSwitchStatus,
  isModelEnabled,
} from './service';

export { default as adminRoutes } from './routes';
export * from './types';
