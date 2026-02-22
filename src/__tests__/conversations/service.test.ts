import {
  createConversation,
  listConversations,
  getConversation,
  renameConversation,
  deleteConversation,
} from '../../conversations/service';

// Mock database pool
const mockQuery = jest.fn();
jest.mock('../../db/pool', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

describe('Conversation Service', () => {
  const userId = 'test-user-id';

  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const mockConversation = {
        id: 'conv-id',
        userId,
        title: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockConversation] });

      const result = await createConversation(userId);

      expect(result.id).toBe('conv-id');
      expect(result.title).toBe('New Chat');
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should create conversation with custom title', async () => {
      const mockConversation = {
        id: 'conv-id',
        userId,
        title: 'Custom Title',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockConversation] });

      const result = await createConversation(userId, 'Custom Title');

      expect(result.title).toBe('Custom Title');
    });
  });

  describe('listConversations', () => {
    it('should return user conversations', async () => {
      const mockConversations = [
        { id: 'conv-1', userId, title: 'Chat 1', messageCount: 2, createdAt: new Date(), updatedAt: new Date() },
        { id: 'conv-2', userId, title: 'Chat 2', messageCount: 1, createdAt: new Date(), updatedAt: new Date() },
      ];

      // Mock list query (first)
      mockQuery.mockResolvedValueOnce({ rows: mockConversations });
      // Mock count query (second)
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await listConversations(userId);

      expect(result.conversations).toHaveLength(2);
      expect(result.conversations[0].id).toBe('conv-1');
    });

    it('should respect limit and offset', async () => {
      // Mock list query (first)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock count query (second)
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await listConversations(userId, { limit: 10, offset: 5 });

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('getConversation', () => {
    it('should return conversation with messages', async () => {
      const mockConversation = {
        id: 'conv-id',
        userId,
        title: 'Test Chat',
        messageCount: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockMessages = [
        { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!', createdAt: new Date() },
      ];

      mockQuery.mockResolvedValueOnce({ rows: [mockConversation] });
      mockQuery.mockResolvedValueOnce({ rows: mockMessages });

      const result = await getConversation('conv-id', userId);

      expect(result.id).toBe('conv-id');
      expect(result.messages).toHaveLength(2);
    });

    it('should throw error for non-existent conversation', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(getConversation('non-existent', userId)).rejects.toThrow();
    });
  });

  describe('renameConversation', () => {
    it('should rename conversation title', async () => {
      const mockConversation = {
        id: 'conv-id',
        userId,
        title: 'Updated Title',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock find conversation
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'conv-id', userId }] });
      // Mock update
      mockQuery.mockResolvedValueOnce({ rows: [mockConversation] });

      const result = await renameConversation('conv-id', userId, 'Updated Title');

      expect(result.title).toBe('Updated Title');
    });

    it('should throw error for unauthorized rename', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        renameConversation('conv-id', 'other-user', 'Hacked')
      ).rejects.toThrow();
    });
  });

  describe('deleteConversation', () => {
    it('should soft delete conversation', async () => {
      // Mock find conversation (with correct userId)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'conv-id', userId }] });
      // Mock delete
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'conv-id' }] });

      await deleteConversation('conv-id', userId);

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error for non-existent conversation', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(deleteConversation('non-existent', userId)).rejects.toThrow();
    });
  });
});
