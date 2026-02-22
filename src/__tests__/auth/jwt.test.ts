import { generateToken, validateToken } from '../../auth/jwt';
import { storeSession, deleteSession } from '../../auth/session';

// Mock Redis
jest.mock('../../db/redis', () => ({
  getRedis: () => ({
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockImplementation((key: string) => {
      if (key.includes('test-session')) {
        return Promise.resolve(JSON.stringify({ userId: 'test-user-id' }));
      }
      return Promise.resolve(null);
    }),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  }),
}));

describe('JWT Utils', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      
      const result = generateToken(userId, email);
      
      expect(result.token).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3);
    });

    it('should include role in token when provided', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      const role = 'admin';
      
      const result = generateToken(userId, email, role);
      
      expect(result.token).toBeDefined();
      // Decode payload to verify role
      const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64').toString());
      expect(payload.role).toBe('admin');
    });

    it('should default role to user when not provided', () => {
      const userId = 'test-user-id';
      const email = 'test@example.com';
      
      const result = generateToken(userId, email);
      
      const payload = JSON.parse(Buffer.from(result.token.split('.')[1], 'base64').toString());
      expect(payload.role).toBe('user');
    });

    it('should generate unique session IDs', () => {
      const result1 = generateToken('user1', 'user1@example.com');
      const result2 = generateToken('user2', 'user2@example.com');
      
      expect(result1.sessionId).not.toBe(result2.sessionId);
    });
  });

  describe('validateToken', () => {
    it('should reject invalid token', async () => {
      await expect(validateToken('invalid-token')).rejects.toThrow();
    });

    it('should reject token with invalid signature', async () => {
      const { token } = generateToken('test-user-id', 'test@example.com');
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      await expect(validateToken(tamperedToken)).rejects.toThrow();
    });
  });
});
