// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1
// @cpt-flow:cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check:p1
// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-chat-core-rate-limiting:p1

import { getRedis } from '../db/redis';
import { RateLimitResult, RateLimitError } from './types';

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-define-limits
const RATE_LIMIT_USER_PER_MIN = parseInt(process.env.RATE_LIMIT_USER_PER_MIN || '60', 10);
const RATE_LIMIT_IP_PER_MIN = parseInt(process.env.RATE_LIMIT_IP_PER_MIN || '100', 10);
const RATE_LIMIT_ANON_PER_MIN = parseInt(process.env.RATE_LIMIT_ANON_PER_MIN || '10', 10);
const RATE_LIMIT_WINDOW_SECONDS = 60;
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-define-limits

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check:p1:inst-extract-identifiers
export function extractIdentifiers(req: { user?: { sub: string }; ip?: string }): { userId: string | null; ip: string } {
  return {
    userId: req.user?.sub || null,
    ip: req.ip || '0.0.0.0',
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check:p1:inst-extract-identifiers

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-get-user-count
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-get-ip-count
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-calc-remaining
async function getCount(key: string): Promise<number> {
  const redis = getRedis();
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-calc-remaining
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-get-ip-count
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-get-user-count

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-incr-count
async function incrementCount(key: string): Promise<number> {
  const redis = getRedis();
  const count = await redis.incr(key);
  
  // Set expiry on first increment
  if (count === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
  }
  
  return count;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-incr-count

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-return-blocked
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-return-allowed
export async function checkRateLimit(
  userId: string | null,
  ip: string
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + RATE_LIMIT_WINDOW_SECONDS;
  
  // Determine limit based on authentication status
  const isAuthenticated = userId !== null;
  const ipLimit = isAuthenticated ? RATE_LIMIT_IP_PER_MIN : RATE_LIMIT_ANON_PER_MIN;
  
  // Check IP limit
  const ipKey = `rate_limit:ip:${ip}`;
  const ipCount = await getCount(ipKey);
  
  if (ipCount >= ipLimit) {
    const ttl = await redis.ttl(ipKey);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS),
      limit: ipLimit,
    };
  }
  
  // Check user limit if authenticated
  if (isAuthenticated) {
    const userKey = `rate_limit:user:${userId}`;
    const userCount = await getCount(userKey);
    
    if (userCount >= RATE_LIMIT_USER_PER_MIN) {
      const ttl = await redis.ttl(userKey);
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS),
        limit: RATE_LIMIT_USER_PER_MIN,
      };
    }
    
    // Increment user counter
    await incrementCount(userKey);
  }
  
  // Increment IP counter
  await incrementCount(ipKey);
  
  // Calculate remaining
  const remaining = isAuthenticated
    ? Math.min(RATE_LIMIT_USER_PER_MIN - ipCount - 1, ipLimit - ipCount - 1)
    : ipLimit - ipCount - 1;
  
  return {
    allowed: true,
    remaining: Math.max(0, remaining),
    resetAt,
    limit: isAuthenticated ? RATE_LIMIT_USER_PER_MIN : ipLimit,
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-return-allowed
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-chat-core-rate-limit:p1:inst-return-blocked

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check:p1:inst-limit-exceeded
export async function enforceRateLimit(
  userId: string | null,
  ip: string
): Promise<RateLimitResult> {
  const result = await checkRateLimit(userId, ip);
  
  if (!result.allowed) {
    const retryAfter = result.resetAt - Math.floor(Date.now() / 1000);
    throw new RateLimitError(retryAfter);
  }
  
  return result;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check:p1:inst-limit-exceeded

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check:p1:inst-set-rate-headers
export function setRateLimitHeaders(
  res: { setHeader: (name: string, value: string | number) => void },
  result: RateLimitResult
): void {
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetAt);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-flow-chat-core-rate-limit-check:p1:inst-set-rate-headers

export { RATE_LIMIT_USER_PER_MIN, RATE_LIMIT_IP_PER_MIN, RATE_LIMIT_ANON_PER_MIN };
