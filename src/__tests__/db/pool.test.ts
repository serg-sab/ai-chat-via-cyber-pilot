import { initPool, getPool, closePool } from '../../db/pool';

// Mock pg
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

describe('Database Pool', () => {
  beforeAll(() => {
    initPool();
  });

  afterAll(async () => {
    await closePool();
  });

  describe('getPool', () => {
    it('should return a pool instance', () => {
      const pool = getPool();
      expect(pool).toBeDefined();
      expect(pool.query).toBeDefined();
    });

    it('should return the same pool instance on multiple calls', () => {
      const pool1 = getPool();
      const pool2 = getPool();
      expect(pool1).toBe(pool2);
    });
  });

  describe('closePool', () => {
    it('should close the pool without error', async () => {
      await expect(closePool()).resolves.not.toThrow();
    });
  });
});
