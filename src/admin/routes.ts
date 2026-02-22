// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-metrics-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-usage-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-feature-flags-endpoint:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-kill-switch-endpoint:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-admin-dashboard-auth:p1

import { Router, Request, Response } from 'express';
import {
  aggregateMetrics,
  getUsageStats,
  getFeatureFlags,
  setFeatureFlag,
  setKillSwitch,
  KNOWN_FEATURE_FLAGS,
  KNOWN_MODELS,
} from './service';
import { authMiddleware } from '../auth/middleware';
import { Period } from './types';

const router = Router();

// All admin routes require authentication
router.use(authMiddleware);

// Admin role check middleware
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1:inst-validate-admin-metrics
function requireAdmin(req: Request, res: Response, next: () => void) {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1:inst-validate-admin-metrics

router.use(requireAdmin);

function parsePeriod(periodStr: string | undefined): Period {
  if (periodStr === '24h' || periodStr === '7d' || periodStr === '30d') {
    return periodStr;
  }
  return '24h';
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1:inst-request-metrics
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1:inst-aggregate-metrics
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1:inst-return-metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period as string);
    const metrics = await aggregateMetrics(period);
    res.json(metrics);
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1:inst-return-metrics
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1:inst-aggregate-metrics
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-metrics:p1:inst-request-metrics

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-validate-admin-usage
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period as string);
    const usage = await getUsageStats(period);
    res.json(usage);
  } catch (err) {
    console.error('Usage stats error:', err);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-view-usage:p1:inst-validate-admin-usage

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-validate-admin-flags
router.get('/feature-flags', async (req: Request, res: Response) => {
  try {
    const flags = await getFeatureFlags();
    res.json({ flags, knownFlags: KNOWN_FEATURE_FLAGS });
  } catch (err) {
    console.error('Feature flags error:', err);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

router.post('/feature-flags', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { flag, enabled } = req.body;

    if (!flag || typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Invalid request. Required: { flag: string, enabled: boolean }' });
      return;
    }

    if (!KNOWN_FEATURE_FLAGS.includes(flag)) {
      res.status(400).json({ error: `Unknown feature flag: ${flag}. Known flags: ${KNOWN_FEATURE_FLAGS.join(', ')}` });
      return;
    }

    const flags = await setFeatureFlag(flag, enabled, userId);
    res.json({ flags, message: `Feature flag '${flag}' set to ${enabled}` });
  } catch (err) {
    console.error('Set feature flag error:', err);
    res.status(500).json({ error: 'Failed to set feature flag' });
  }
});
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-feature-flags:p2:inst-validate-admin-flags

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-validate-admin-kill
router.post('/kill-switch', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { model, enabled } = req.body;

    if (!model || typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Invalid request. Required: { model: string, enabled: boolean }' });
      return;
    }

    if (!KNOWN_MODELS.includes(model)) {
      res.status(400).json({ error: `Unknown model: ${model}. Known models: ${KNOWN_MODELS.join(', ')}` });
      return;
    }

    const status = await setKillSwitch(model, enabled, userId);
    res.json({ 
      status, 
      message: enabled ? `Model '${model}' is now enabled` : `Model '${model}' is now disabled (kill switch active)` 
    });
  } catch (err) {
    console.error('Kill switch error:', err);
    res.status(500).json({ error: 'Failed to set kill switch' });
  }
});
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-admin-dashboard-kill-switch:p2:inst-validate-admin-kill

export default router;
