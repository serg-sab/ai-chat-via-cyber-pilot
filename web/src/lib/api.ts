const API_BASE = '/api/v1';

interface ApiError {
  error: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Auth API
export async function register(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ token: string; user: User }>(response);
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<{ token: string; user: User }>(response);
}

export async function logout() {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ message: string }>(response);
}

export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<User>(response);
}

// Conversations API
export async function getConversations(limit = 20, offset = 0) {
  const response = await fetch(`${API_BASE}/conversations?limit=${limit}&offset=${offset}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ conversations: Conversation[]; total: number }>(response);
}

export async function createConversation(title?: string) {
  const response = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ title }),
  });
  return handleResponse<Conversation>(response);
}

export async function getConversation(id: string) {
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleResponse<Conversation & { messages: Message[] }>(response);
  // Backend returns conversation with messages embedded, restructure for frontend
  const { messages, ...conversation } = data;
  return { conversation, messages };
}

export async function deleteConversation(id: string) {
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ message: string }>(response);
}

export async function renameConversation(id: string, title: string) {
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ title }),
  });
  return handleResponse<Conversation>(response);
}

// Chat API (SSE streaming)
export function sendMessage(
  conversationId: string,
  content: string,
  onToken: (token: string) => void,
  onDone: (messageId: string) => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem('token');

  fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'token') {
                onToken(data.content);
              } else if (currentEvent === 'done') {
                onDone(data.messageId);
              } else if (currentEvent === 'error') {
                onError(data.error || data.message);
              }
            } catch {
              // Ignore parse errors
            }
            currentEvent = '';
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message);
      }
    });

  return controller;
}

export async function stopGeneration(conversationId: string) {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/stop`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ message: string }>(response);
}

export async function regenerateResponse(
  conversationId: string,
  onToken: (token: string) => void,
  onDone: (messageId: string) => void,
  onError: (error: string) => void
): Promise<AbortController> {
  const controller = new AbortController();
  const token = localStorage.getItem('token');

  fetch(`${API_BASE}/conversations/${conversationId}/regenerate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'token') {
                onToken(data.content);
              } else if (currentEvent === 'done') {
                onDone(data.messageId);
              } else if (currentEvent === 'error') {
                onError(data.error || data.message);
              }
            } catch {
              // Ignore parse errors
            }
            currentEvent = '';
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message);
      }
    });

  return controller;
}

// Admin API
export interface AdminMetrics {
  requestVolume: { total: number; byHour: { hour: string; count: number }[] };
  latency: { p50: number; p95: number; p99: number };
  errors: { total: number; rate: number; byType: Record<string, number> };
  period: string;
}

export interface UsageStats {
  tokens: { input: number; output: number; total: number };
  cost: { estimated: number; currency: string };
  topUsers: { rank: number; odUserId: string; messageCount: number }[];
  period: string;
}

export interface FeatureFlags {
  flags: Record<string, boolean>;
  knownFlags: string[];
}

export interface KillSwitchStatus {
  model: string;
  enabled: boolean;
}

export interface Report {
  id: string;
  messageId: string;
  reporterId: string;
  reason: string | null;
  status: 'pending' | 'dismissed' | 'action_taken';
  createdAt: string;
  resolvedAt: string | null;
}

export async function getAdminMetrics(period: '24h' | '7d' | '30d' = '24h') {
  const response = await fetch(`${API_BASE}/admin/metrics?period=${period}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<AdminMetrics>(response);
}

export async function getAdminUsage(period: '24h' | '7d' | '30d' = '24h') {
  const response = await fetch(`${API_BASE}/admin/usage?period=${period}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<UsageStats>(response);
}

export async function getFeatureFlags() {
  const response = await fetch(`${API_BASE}/admin/feature-flags`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<FeatureFlags>(response);
}

export async function setFeatureFlag(flag: string, enabled: boolean) {
  const response = await fetch(`${API_BASE}/admin/feature-flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ flag, enabled }),
  });
  return handleResponse<{ flags: Record<string, boolean>; message: string }>(response);
}

export async function setKillSwitch(model: string, enabled: boolean) {
  const response = await fetch(`${API_BASE}/admin/kill-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ model, enabled }),
  });
  return handleResponse<{ status: KillSwitchStatus; message: string }>(response);
}

export async function getAdminReports(limit = 20, offset = 0) {
  const response = await fetch(`${API_BASE}/admin/reports?limit=${limit}&offset=${offset}`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse<{ reports: Report[]; total: number }>(response);
}

export async function resolveReport(reportId: string, status: 'dismissed' | 'action_taken', notes?: string) {
  const response = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status, notes }),
  });
  return handleResponse<Report>(response);
}

// Moderation API
export async function reportMessage(messageId: string, reason: string) {
  const response = await fetch(`${API_BASE}/messages/${messageId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<{ id: string; messageId: string; status: string }>(response);
}

// Types
export interface User {
  id: string;
  email: string;
  settings: {
    theme: 'light' | 'dark' | 'system';
  };
  status: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
