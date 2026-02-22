// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2
import { Pool, PoolConfig } from 'pg';

export interface PoolSettings {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

const DEFAULT_POOL_SETTINGS: PoolSettings = {
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

let pool: Pool | null = null;

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-set-min-pool
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-set-max-pool
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-set-idle-timeout
// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-set-conn-timeout
export function getPoolConfig(settings: Partial<PoolSettings> = {}): PoolConfig {
  const mergedSettings = { ...DEFAULT_POOL_SETTINGS, ...settings };
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    connectionString,
    min: mergedSettings.min,
    max: mergedSettings.max,
    idleTimeoutMillis: mergedSettings.idleTimeoutMillis,
    connectionTimeoutMillis: mergedSettings.connectionTimeoutMillis,
  };
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-set-conn-timeout
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-set-idle-timeout
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-set-max-pool
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-set-min-pool

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-init-pool
export function initPool(settings: Partial<PoolSettings> = {}): Pool {
  if (pool) {
    return pool;
  }

  const config = getPoolConfig(settings);
  pool = new Pool(config);

  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-init-pool

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-test-pool
export async function testPoolConnection(): Promise<boolean> {
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT 1 as health_check');
    return result.rows[0].health_check === 1;
  } finally {
    client.release();
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-test-pool

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-return-pool-ready
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-config-pool:p2:inst-return-pool-ready
