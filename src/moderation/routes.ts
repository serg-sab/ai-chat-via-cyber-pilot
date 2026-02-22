// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-content-moderation-report-endpoint:p2

import { Router, Request, Response } from 'express';
import { createReport, listPendingReports, resolveReport } from './service';
import { authMiddleware } from '../auth/middleware';
import { ModerationError } from './types';

const router = Router();

// All moderation routes require authentication
router.use(authMiddleware);

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-validate-auth-report
// Report a message
router.post('/messages/:messageId/report', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { messageId } = req.params;
    const { reason } = req.body;

    const report = await createReport(messageId, userId, reason || null);
    res.status(201).json(report);
  } catch (err) {
    if (err instanceof ModerationError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Report creation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-report:p2:inst-validate-auth-report

// Admin routes
const adminRouter = Router();
adminRouter.use(authMiddleware);

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-validate-admin
// List pending reports (admin only)
adminRouter.get('/reports', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check admin role
    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await listPendingReports(limit, offset);
    res.json(result);
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve a report (admin only)
adminRouter.patch('/reports/:reportId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { reportId } = req.params;
    const { status, notes } = req.body;

    if (!status || !['dismissed', 'action_taken'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be "dismissed" or "action_taken"' });
      return;
    }

    const report = await resolveReport(reportId, userId, status, notes);
    res.json(report);
  } catch (err) {
    if (err instanceof ModerationError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Resolve report error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-content-moderation-review:p2:inst-validate-admin

export { router as moderationRoutes, adminRouter as adminModerationRoutes };
