// @cpt-algo:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1
import * as fs from 'fs';
import * as path from 'path';
import { Pool, PoolClient } from 'pg';
import { initPool, closePool } from './pool';

interface MigrationRecord {
  version: string;
  applied_at: Date;
}

interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  error?: string;
}

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-connect-db
async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-connect-db

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-get-applied
async function getAppliedMigrations(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<MigrationRecord>(
    'SELECT version FROM migrations ORDER BY version'
  );
  return new Set(result.rows.map(row => row.version));
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-get-applied

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-read-files
function getMigrationFiles(migrationsDir: string): string[] {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  return files;
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-read-files

// @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-loop-migrations
export async function runMigrations(migrationsDir?: string): Promise<MigrationResult> {
  const dir = migrationsDir || path.join(__dirname, 'migrations');
  const appliedMigrations: string[] = [];
  
  const pool = initPool();
  const client = await pool.connect();
  
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles(dir);
    
    const pending = files.filter(f => !applied.has(f));
    
    for (const file of pending) {
      // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-try-migration
      try {
        // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-begin-tx
        await client.query('BEGIN');
        // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-begin-tx
        
        // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-exec-sql
        const sql = fs.readFileSync(path.join(dir, file), 'utf-8');
        await client.query(sql);
        // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-exec-sql
        
        // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-record-migration
        await client.query(
          'INSERT INTO migrations (version, applied_at) VALUES ($1, NOW())',
          [file]
        );
        // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-record-migration
        
        // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-commit-tx
        await client.query('COMMIT');
        // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-commit-tx
        
        appliedMigrations.push(file);
        console.log(`Applied migration: ${file}`);
      } catch (error) {
        // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-catch-error
        // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-rollback-tx
        await client.query('ROLLBACK');
        // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-rollback-tx
        
        // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-return-error
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Migration failed: ${file}`, errorMessage);
        return {
          success: false,
          appliedMigrations,
          error: `Migration ${file} failed: ${errorMessage}`,
        };
        // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-return-error
        // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-catch-error
      }
      // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-try-migration
    }
    
    // @cpt-begin:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-return-success
    return {
      success: true,
      appliedMigrations,
    };
    // @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-return-success
  } finally {
    client.release();
  }
}
// @cpt-end:cpt-ai-chat-via-cyber-pilot-algo-database-foundation-run-migrations:p1:inst-loop-migrations

// CLI entry point
if (require.main === module) {
  require('dotenv').config();
  
  runMigrations()
    .then(result => {
      if (result.success) {
        console.log(`Migrations complete. Applied: ${result.appliedMigrations.length}`);
        process.exit(0);
      } else {
        console.error('Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Migration error:', err);
      process.exit(1);
    })
    .finally(() => closePool());
}
