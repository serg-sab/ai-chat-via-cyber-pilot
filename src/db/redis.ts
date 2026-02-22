// @cpt-dod:cpt-ai-chat-via-cyber-pilot-dod-database-foundation-redis-setup:p1
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function initRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  redisClient = new Redis(redisUrl);

  redisClient.on('error', (err: Error) => {
    console.error('Redis connection error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected');
  });

  return redisClient;
}

export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redisClient;
}

export async function testRedisConnection(): Promise<boolean> {
  const client = getRedis();
  const result = await client.ping();
  return result === 'PONG';
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
