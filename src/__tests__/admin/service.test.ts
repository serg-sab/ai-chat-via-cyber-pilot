import {
  aggregateMetrics,
  getUsageStats,
  getFeatureFlags,
  setFeatureFlag,
  setKillSwitch,
} from '../../admin/service';

// Mock database pool
const mockQuery = jest.fn();
jest.mock('../../db/pool', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

// Mock Redis
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisHgetall = jest.fn();
const mockRedisHset = jest.fn();

jest.mock('../../db/redis', () => ({
  getRedis: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    hgetall: mockRedisHgetall,
    hset: mockRedisHset,
  }),
}));

describe('Admin Service', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRedisGet.mockReset();
    mockRedisSet.mockReset();
    mockRedisHgetall.mockReset();
    mockRedisHset.mockReset();
  });

  describe('aggregateMetrics', () => {
    it('should aggregate metrics for 24h period', async () => {
      // Mock total requests
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '100' }] });
      // Mock requests by hour
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock latency percentiles
      mockQuery.mockResolvedValueOnce({ rows: [{ p50: 50, p95: 150, p99: 300 }] });
      // Mock errors
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await aggregateMetrics('24h');

      expect(result.period).toBe('24h');
      expect(result.requestVolume.total).toBe(100);
      expect(result.latency.p50).toBe(50);
      expect(result.latency.p95).toBe(150);
    });

    it('should handle empty data', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ p50: 0, p95: 0, p99: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await aggregateMetrics('24h');

      expect(result.requestVolume.total).toBe(0);
      expect(result.errors.total).toBe(0);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      // Mock token usage
      mockQuery.mockResolvedValueOnce({ rows: [{ total_tokens: '10000' }] });
      // Mock top users
      mockQuery.mockResolvedValueOnce({
        rows: [
          { user_id: 'user-1', count: '50' },
          { user_id: 'user-2', count: '30' },
        ],
      });

      const result = await getUsageStats('24h');

      expect(result.period).toBe('24h');
      expect(result.tokens.output).toBe(10000);
      expect(result.topUsers).toHaveLength(2);
    });
  });

  describe('getFeatureFlags', () => {
    it('should return feature flags with defaults', async () => {
      mockRedisHgetall.mockResolvedValueOnce({});

      const result = await getFeatureFlags();

      expect(result.moderation_enabled).toBe(true);
      expect(result.streaming_enabled).toBe(true);
    });

    it('should merge stored values with defaults', async () => {
      mockRedisHgetall.mockResolvedValueOnce({
        moderation_enabled: 'false',
      });

      const result = await getFeatureFlags();

      expect(result.moderation_enabled).toBe(false);
      expect(result.streaming_enabled).toBe(true);
    });
  });

  describe('setFeatureFlag', () => {
    it('should set a feature flag', async () => {
      mockRedisHset.mockResolvedValueOnce(1);
      mockRedisHgetall.mockResolvedValueOnce({ moderation_enabled: 'false' });

      const result = await setFeatureFlag('moderation_enabled', false, 'admin-id');

      expect(mockRedisHset).toHaveBeenCalledWith(
        'feature_flags',
        'moderation_enabled',
        'false'
      );
      expect(result.moderation_enabled).toBe(false);
    });

    it('should reject unknown flag', async () => {
      await expect(
        setFeatureFlag('unknown_flag', true, 'admin-id')
      ).rejects.toThrow('Unknown feature flag');
    });
  });

  describe('setKillSwitch', () => {
    it('should enable kill switch for model', async () => {
      mockRedisSet.mockResolvedValueOnce('OK');

      const result = await setKillSwitch('gpt-4o-mini', false, 'admin-id');

      expect(result.model).toBe('gpt-4o-mini');
      expect(result.enabled).toBe(false);
    });

    it('should reject unknown model', async () => {
      await expect(
        setKillSwitch('unknown-model', false, 'admin-id')
      ).rejects.toThrow('Unknown model');
    });
  });
});
