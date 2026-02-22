import { createReport, checkContentSafety } from '../../moderation/service';

// Mock database pool
const mockQuery = jest.fn();
jest.mock('../../db/pool', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

// Mock OpenAI for moderation
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    moderations: {
      create: jest.fn().mockResolvedValue({
        results: [{
          flagged: false,
          categories: {},
          category_scores: {},
        }],
      }),
    },
  }));
});

describe('Moderation Service', () => {
  const userId = 'test-user-id';
  const messageId = 'test-message-id';

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('createReport', () => {
    it('should create a report for a message', async () => {
      const mockReport = {
        id: 'report-id',
        messageId,
        reporterId: userId,
        reason: 'Inappropriate content',
        status: 'pending',
        createdAt: new Date(),
      };

      // Mock message exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: messageId, conversation_id: 'conv-id' }],
      });
      // Mock conversation ownership check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'conv-id', user_id: userId }],
      });
      // Mock check existing report
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock insert report
      mockQuery.mockResolvedValueOnce({ rows: [mockReport] });
      // Mock log event
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'log-id' }] });

      const result = await createReport(messageId, userId, 'Inappropriate content');

      expect(result.id).toBe('report-id');
      expect(result.status).toBe('pending');
    });

    it('should throw error for non-existent message', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        createReport('non-existent', userId, 'Test reason')
      ).rejects.toThrow();
    });

    it('should allow report without reason', async () => {
      const mockReport = {
        id: 'report-id',
        messageId,
        reporterId: userId,
        reason: null,
        status: 'pending',
        createdAt: new Date(),
      };

      // Mock message exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: messageId, conversation_id: 'conv-id' }],
      });
      // Mock conversation ownership check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'conv-id', user_id: userId }],
      });
      // Mock check existing report
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock insert report
      mockQuery.mockResolvedValueOnce({ rows: [mockReport] });
      // Mock log event
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'log-id' }] });

      const result = await createReport(messageId, userId, null);

      expect(result.reason).toBeNull();
    });
  });

  describe('checkContentSafety', () => {
    it('should return pass for normal content', async () => {
      const result = await checkContentSafety('Hello, how are you?', 'input');
      
      expect(result.result).toBe('pass');
      expect(result.categories).toHaveLength(0);
    });
  });
});
