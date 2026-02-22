// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-jwt-middleware:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1

import { Request, Response, NextFunction } from 'express';
import { validateToken } from './jwt';
import { JwtPayload, AuthError } from './types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1:inst-submit-me
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1:inst-validate-jwt-me
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthError('No authorization header', 401);
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthError('Invalid authorization format', 401);
    }
    
    const token = parts[1];
    const payload = await validateToken(token);
    
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1:inst-validate-jwt-me
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-me:p1:inst-submit-me

export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }
  
  authMiddleware(req, res, next);
}
