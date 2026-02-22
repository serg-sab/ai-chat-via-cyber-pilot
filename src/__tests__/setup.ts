import 'dotenv/config';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Allow async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
