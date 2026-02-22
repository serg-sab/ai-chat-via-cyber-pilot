// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-user-auth-session-mgmt:p1

import { getRedis } from '../db/redis';
import { SessionData } from './types';

const SESSION_PREFIX = 'session:';
const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session:p1:inst-build-session-data
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session:p1:inst-redis-set-session
export async function storeSession(sessionId: string, userId: string): Promise<void> {
  const redis = getRedis();
  
  const sessionData: SessionData = {
    userId,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  
  await redis.setex(
    `${SESSION_PREFIX}${sessionId}`,
    SESSION_TTL_SECONDS,
    JSON.stringify(sessionData)
  );
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session:p1:inst-redis-set-session
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session:p1:inst-build-session-data

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session:p1:inst-return-session-stored
export { storeSession as store };
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-user-auth-store-session:p1:inst-return-session-stored

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const redis = getRedis();
  const data = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  
  if (!data) {
    return null;
  }
  
  return JSON.parse(data) as SessionData;
}

// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1:inst-delete-session
export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`${SESSION_PREFIX}${sessionId}`);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-user-auth-logout:p1:inst-delete-session

export async function refreshSession(sessionId: string): Promise<void> {
  const redis = getRedis();
  const data = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  
  if (data) {
    const session = JSON.parse(data) as SessionData;
    session.lastActive = new Date().toISOString();
    
    await redis.setex(
      `${SESSION_PREFIX}${sessionId}`,
      SESSION_TTL_SECONDS,
      JSON.stringify(session)
    );
  }
}
