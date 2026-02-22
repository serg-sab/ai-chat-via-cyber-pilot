import { register, login } from '../../auth/service';
import { AuthError } from '../../auth/types';

// Mock database pool
const mockQuery = jest.fn();
jest.mock('../../db/pool', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

// Mock Redis
jest.mock('../../db/redis', () => ({
  getRedis: () => ({
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(JSON.stringify({ userId: 'test-user-id' })),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  }),
}));

describe('Auth Service', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        passwordHash: 'hashed',
        status: 'active',
        settings: { theme: 'system' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock: check email doesn't exist
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock: insert user
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await register({
        email: 'newuser@example.com',
        password: 'StrongPass123!',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('newuser@example.com');
    });

    it('should reject invalid email format', async () => {
      await expect(
        register({ email: 'invalid-email', password: 'StrongPass123!' })
      ).rejects.toThrow(AuthError);
    });

    it('should reject weak password', async () => {
      await expect(
        register({ email: 'test@example.com', password: 'weak' })
      ).rejects.toThrow(AuthError);
    });

    it('should reject duplicate email', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'existing-user', email: 'existing@example.com' }],
      });

      await expect(
        register({ email: 'existing@example.com', password: 'StrongPass123!' })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('CorrectPass123!', 12);

      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        status: 'active',
        settings: { theme: 'system' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await login({
        email: 'user@example.com',
        password: 'CorrectPass123!',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('user@example.com');
    });

    it('should reject non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        login({ email: 'nonexistent@example.com', password: 'AnyPass123!' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject incorrect password', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('CorrectPass123!', 12);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: 'user@example.com',
          passwordHash: hashedPassword,
          status: 'active',
          settings: {},
        }],
      });

      await expect(
        login({ email: 'user@example.com', password: 'WrongPass123!' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('CorrectPass123!', 12);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: 'user@example.com',
          passwordHash: hashedPassword,
          status: 'suspended',
          settings: {},
        }],
      });

      await expect(
        login({ email: 'user@example.com', password: 'CorrectPass123!' })
      ).rejects.toThrow('Account is not active');
    });
  });
});
