// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-register-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-login-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-oauth-endpoint:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-logout-endpoint:p1

import { Router, Request, Response } from 'express';
import { register, login, oauthGoogle, getCurrentUser } from './service';
import { deleteSession } from './session';
import { authMiddleware } from './middleware';
import { AuthError } from './types';

const router = Router();

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-register:p1
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    const result = await register({ email, password });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-login:p1
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    
    const result = await login({ email, password });
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-oauth-google:p1
router.post('/oauth/google', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({ error: 'OAuth token is required' });
      return;
    }
    
    const result = await oauthGoogle({ token });
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('OAuth error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1:inst-submit-logout
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1:inst-extract-session-id
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const sessionId = req.user?.sid;
    
    if (sessionId) {
      await deleteSession(sessionId);
    }
    
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1:inst-return-logout-ok
    res.json({ message: 'Logged out successfully' });
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1:inst-return-logout-ok
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1:inst-extract-session-id
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1:inst-submit-logout

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    const user = await getCurrentUser(userId);
    res.json(user);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      console.error('Get user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
