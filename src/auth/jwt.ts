// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1
// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-jwt-middleware:p1

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload, AuthError } from './types';
import { getSession } from './session';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1:inst-generate-session-id
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1:inst-build-claims
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1:inst-sign-jwt
export function generateToken(userId: string, email: string): { token: string; sessionId: string } {
  const sessionId = uuidv4();
  
  const payload = {
    sub: userId,
    email,
    sid: sessionId,
  };
  
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
  
  return { token, sessionId };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1:inst-sign-jwt
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1:inst-build-claims
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1:inst-generate-session-id

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1:inst-return-jwt
export { generateToken as generate };
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-generate-jwt:p1:inst-return-jwt

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-verify-signature
export async function validateToken(token: string): Promise<JwtPayload> {
  let decoded: JwtPayload;
  
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-invalid-signature
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid token signature', 401);
    }
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-invalid-signature
    
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-check-expiration
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-token-expired
    if (err instanceof jwt.TokenExpiredError) {
      throw new AuthError('Token expired', 401);
    }
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-token-expired
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-check-expiration
    
    throw new AuthError('Token validation failed', 401);
  }
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-verify-signature

  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-check-session-exists
  const session = await getSession(decoded.sid);
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-check-session-exists
  
  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-session-not-found
  if (!session) {
    throw new AuthError('Session not found or expired', 401);
  }
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-session-not-found

  // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-return-claims
  return decoded;
  // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-validate-jwt:p1:inst-return-claims
}

export { validateToken as validate };
