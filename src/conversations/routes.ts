// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-create-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-list-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-get-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-rename-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-delete-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-conversation-mgmt-search-endpoint:p2

import { Router, Request, Response } from 'express';
import {
  createConversation,
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
  searchConversations,
} from './service';
import { authMiddleware } from '../auth/middleware';
import { ConversationError } from './types';

const router = Router();

// All conversation routes require authentication
router.use(authMiddleware);

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-search:p2
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    const conversations = await searchConversations(userId, query, limit);
    res.json({ conversations });
  } catch (err) {
    if (err instanceof ConversationError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Search error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-list:p1
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || undefined;
    const offset = parseInt(req.query.offset as string) || undefined;

    const result = await listConversations(userId, { limit, offset });
    res.json(result);
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-create:p1
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { title } = req.body;
    const conversation = await createConversation(userId, title);
    res.status(201).json(conversation);
  } catch (err) {
    if (err instanceof ConversationError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Create conversation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-get:p1
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversation = await getConversation(req.params.id, userId);
    res.json(conversation);
  } catch (err) {
    if (err instanceof ConversationError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Get conversation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-rename:p1
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { title } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const conversation = await renameConversation(req.params.id, userId, title);
    res.json(conversation);
  } catch (err) {
    if (err instanceof ConversationError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Rename conversation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-return-deleted
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await deleteConversation(req.params.id, userId);
    res.status(204).send();
  } catch (err) {
    if (err instanceof ConversationError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Delete conversation error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-conversation-mgmt-delete:p1:inst-return-deleted

export default router;
