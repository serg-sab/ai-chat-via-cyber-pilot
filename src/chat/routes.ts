// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-send-message-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-stop-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-regenerate-endpoint:p1

import { Router, Request, Response } from 'express';
import { sendMessage, stopGeneration, regenerateResponse } from './service';
import { authMiddleware } from '../auth/middleware';
import { ChatError, RateLimitError } from './types';

const router = Router();

// All chat routes require authentication
router.use(authMiddleware);

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-chat-core-send-message:p1
router.post('/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';

    // This will handle SSE streaming
    await sendMessage(conversationId, userId, ip, content.trim(), res);
  } catch (err) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', err.retryAfter);
      res.status(429).json({ error: err.message, retryAfter: err.retryAfter });
    } else if (err instanceof ChatError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
    } else {
      console.error('Send message route error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-chat-core-stop:p1
router.post('/:conversationId/stop', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conversationId } = req.params;

    await stopGeneration(conversationId, userId);
    res.json({ message: 'Generation stopped' });
  } catch (err) {
    if (err instanceof ChatError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
    } else {
      console.error('Stop generation route error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-chat-core-regenerate:p1
router.post('/:conversationId/regenerate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conversationId } = req.params;
    const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';

    // This will handle SSE streaming
    await regenerateResponse(conversationId, userId, ip, res);
  } catch (err) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', err.retryAfter);
      res.status(429).json({ error: err.message, retryAfter: err.retryAfter });
    } else if (err instanceof ChatError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code });
    } else {
      console.error('Regenerate route error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
