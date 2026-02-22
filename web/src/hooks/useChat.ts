import { useState, useCallback, useRef } from 'react';
import type { Message, Conversation } from '../lib/api';
import {
  getConversations,
  createConversation,
  getConversation,
  deleteConversation,
  renameConversation,
  sendMessage as apiSendMessage,
  stopGeneration,
  regenerateResponse,
} from '../lib/api';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isGenerating: boolean;
  streamingContent: string;
  error: string | null;
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    conversations: [],
    currentConversation: null,
    messages: [],
    isLoading: false,
    isGenerating: false,
    streamingContent: '',
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const result = await getConversations();
      setState((s) => ({ ...s, conversations: result.conversations, isLoading: false }));
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message, isLoading: false }));
    }
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const result = await getConversation(id);
      setState((s) => ({
        ...s,
        currentConversation: result.conversation,
        messages: result.messages,
        isLoading: false,
      }));
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message, isLoading: false }));
    }
  }, []);

  const newConversation = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const conversation = await createConversation();
      setState((s) => ({
        ...s,
        conversations: [conversation, ...s.conversations],
        currentConversation: conversation,
        messages: [],
        isLoading: false,
      }));
      return conversation;
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message, isLoading: false }));
      return null;
    }
  }, []);

  const removeConversation = useCallback(async (id: string) => {
    try {
      await deleteConversation(id);
      setState((s) => ({
        ...s,
        conversations: s.conversations.filter((c) => c.id !== id),
        currentConversation: s.currentConversation?.id === id ? null : s.currentConversation,
        messages: s.currentConversation?.id === id ? [] : s.messages,
      }));
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }));
    }
  }, []);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    try {
      const updated = await renameConversation(id, title);
      setState((s) => ({
        ...s,
        conversations: s.conversations.map((c) => (c.id === id ? updated : c)),
        currentConversation: s.currentConversation?.id === id ? updated : s.currentConversation,
      }));
    } catch (err) {
      setState((s) => ({ ...s, error: (err as Error).message }));
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!state.currentConversation) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: state.currentConversation.id,
      role: 'user',
      content,
      metadata: {},
      createdAt: new Date().toISOString(),
    };

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMessage],
      isGenerating: true,
      streamingContent: '',
      error: null,
    }));

    abortControllerRef.current = apiSendMessage(
      state.currentConversation.id,
      content,
      (token) => {
        setState((s) => ({ ...s, streamingContent: s.streamingContent + token }));
      },
      (messageId) => {
        setState((s) => {
          const assistantMessage: Message = {
            id: messageId,
            conversationId: s.currentConversation!.id,
            role: 'assistant',
            content: s.streamingContent,
            metadata: {},
            createdAt: new Date().toISOString(),
          };
          return {
            ...s,
            messages: [...s.messages, assistantMessage],
            isGenerating: false,
            streamingContent: '',
          };
        });
        loadConversations(); // Refresh to get updated title
      },
      (error) => {
        setState((s) => ({ ...s, error, isGenerating: false, streamingContent: '' }));
      }
    );
  }, [state.currentConversation, loadConversations]);

  const stop = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (state.currentConversation) {
      try {
        await stopGeneration(state.currentConversation.id);
      } catch {
        // Ignore stop errors
      }
    }
    setState((s) => {
      if (s.streamingContent) {
        const partialMessage: Message = {
          id: `partial-${Date.now()}`,
          conversationId: s.currentConversation!.id,
          role: 'assistant',
          content: s.streamingContent + ' [stopped]',
          metadata: {},
          createdAt: new Date().toISOString(),
        };
        return {
          ...s,
          messages: [...s.messages, partialMessage],
          isGenerating: false,
          streamingContent: '',
        };
      }
      return { ...s, isGenerating: false, streamingContent: '' };
    });
  }, [state.currentConversation]);

  const regenerate = useCallback(async () => {
    if (!state.currentConversation || state.messages.length === 0) return;

    // Remove last assistant message
    setState((s) => ({
      ...s,
      messages: s.messages.slice(0, -1),
      isGenerating: true,
      streamingContent: '',
      error: null,
    }));

    abortControllerRef.current = await regenerateResponse(
      state.currentConversation.id,
      (token) => {
        setState((s) => ({ ...s, streamingContent: s.streamingContent + token }));
      },
      (messageId) => {
        setState((s) => {
          const assistantMessage: Message = {
            id: messageId,
            conversationId: s.currentConversation!.id,
            role: 'assistant',
            content: s.streamingContent,
            metadata: {},
            createdAt: new Date().toISOString(),
          };
          return {
            ...s,
            messages: [...s.messages, assistantMessage],
            isGenerating: false,
            streamingContent: '',
          };
        });
      },
      (error) => {
        setState((s) => ({ ...s, error, isGenerating: false, streamingContent: '' }));
      }
    );
  }, [state.currentConversation, state.messages.length]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    loadConversations,
    selectConversation,
    newConversation,
    removeConversation,
    updateConversationTitle,
    sendMessage,
    stop,
    regenerate,
    clearError,
  };
}
