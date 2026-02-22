import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message } from '../../lib/api';

interface ChatWindowProps {
  messages: Message[];
  streamingContent: string;
  isGenerating: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  error: string | null;
  onClearError: () => void;
}

export function ChatWindow({
  messages,
  streamingContent,
  isGenerating,
  onSend,
  onStop,
  onRegenerate,
  error,
  onClearError,
}: ChatWindowProps) {
  const lastMessage = messages[messages.length - 1];
  const canRegenerate = lastMessage?.role === 'assistant' && !isGenerating;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
          <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
          <button
            onClick={onClearError}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isGenerating={isGenerating}
      />

      <MessageInput
        onSend={onSend}
        onStop={onStop}
        onRegenerate={onRegenerate}
        isGenerating={isGenerating}
        canRegenerate={canRegenerate}
      />
    </div>
  );
}
