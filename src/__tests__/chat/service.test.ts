import { countTokens, countMessageTokens } from '../../chat/context';

describe('Chat Context', () => {
  describe('countTokens', () => {
    it('should count tokens approximately', () => {
      const text = 'Hello world'; // ~11 chars = ~3 tokens
      const tokens = countTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should handle empty string', () => {
      const tokens = countTokens('');
      expect(tokens).toBe(0);
    });

    it('should scale with text length', () => {
      const shortTokens = countTokens('Hello');
      const longTokens = countTokens('Hello world, this is a longer message');
      
      expect(longTokens).toBeGreaterThan(shortTokens);
    });
  });

  describe('countMessageTokens', () => {
    it('should add overhead for message structure', () => {
      const message = { role: 'user' as const, content: 'Hello' };
      const contentTokens = countTokens('Hello');
      const messageTokens = countMessageTokens(message);
      
      // Should include ~4 token overhead
      expect(messageTokens).toBeGreaterThan(contentTokens);
    });

    it('should handle different roles', () => {
      const userMessage = { role: 'user' as const, content: 'Test' };
      const assistantMessage = { role: 'assistant' as const, content: 'Test' };
      
      // Same content should have same token count regardless of role
      expect(countMessageTokens(userMessage)).toBe(countMessageTokens(assistantMessage));
    });
  });
});
