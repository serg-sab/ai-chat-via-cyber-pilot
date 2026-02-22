// Application entry point
import 'dotenv/config';
import express from 'express';
import { initPool } from './db/pool';
import { initRedis } from './db/redis';
import { authRoutes } from './auth';

const PORT = process.env.PORT || 3000;

async function main() {
  // Initialize database connections
  initPool();
  initRedis();
  
  const app = express();
  
  // Middleware
  app.use(express.json());
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Routes
  app.use('/api/v1/auth', authRoutes);
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
