import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { ConversationList } from './components/Sidebar/ConversationList';
import { ChatWindow } from './components/Chat/ChatWindow';
import { AdminDashboard } from './components/Admin/AdminDashboard';

function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  const auth = useAuth();
  const chat = useChat();

  useEffect(() => {
    if (auth.isAuthenticated) {
      chat.loadConversations();
    }
  }, [auth.isAuthenticated]);

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    if (authMode === 'login') {
      return (
        <LoginForm
          onLogin={auth.login}
          onSwitchToRegister={() => setAuthMode('register')}
        />
      );
    }
    return (
      <RegisterForm
        onRegister={auth.register}
        onSwitchToLogin={() => setAuthMode('login')}
      />
    );
  }

  const handleNewChat = async () => {
    await chat.newConversation();
  };

  const handleSelectConversation = async (id: string) => {
    await chat.selectConversation(id);
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-40 w-72 h-full transition-transform duration-300 ease-in-out`}
      >
        <ConversationList
          conversations={chat.conversations}
          currentId={chat.currentConversation?.id || null}
          onSelect={handleSelectConversation}
          onDelete={chat.removeConversation}
          onNew={handleNewChat}
        />

        {/* User menu */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {auth.user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                {auth.user?.email}
              </span>
            </div>
            <button
              onClick={() => setShowAdmin(true)}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
              title="Admin Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={auth.logout}
              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 lg:px-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate ml-12 lg:ml-0">
            {chat.currentConversation?.title || 'New Chat'}
          </h1>
        </header>

        {/* Chat area */}
        {chat.currentConversation ? (
          <ChatWindow
            messages={chat.messages}
            streamingContent={chat.streamingContent}
            isGenerating={chat.isGenerating}
            onSend={chat.sendMessage}
            onStop={chat.stop}
            onRegenerate={chat.regenerate}
            error={chat.error}
            onClearError={chat.clearError}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to AI Chat
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Start a new conversation or select one from the sidebar
              </p>
              <button
                onClick={handleNewChat}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Dashboard Modal */}
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

export default App;
