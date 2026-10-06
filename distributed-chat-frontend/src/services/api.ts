import type {
  ChatMessage,
  Conversation,
  ConversationType,
  Presence,
  User
} from '../types/chat';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;

    try {
      const parsed = JSON.parse(text) as {
        message?: string;
        error?: string;
      };

      detail = parsed.message ?? parsed.error ?? text;
    } catch {
      // Keep the plain response body when it is not JSON.
    }

    throw new ApiError(
      detail || `Request failed with HTTP ${response.status}`,
      response.status
    );
  }

  return (await response.json()) as T;
}

export const api = {
  // -----------------------------
  // Users
  // -----------------------------

  listUsers(): Promise<User[]> {
    return request<User[]>('/api/users');
  },

  createUser(payload: {
    username: string;
  }): Promise<User> {
    return request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // -----------------------------
  // Conversations
  // -----------------------------

  listConversations(userId: string): Promise<Conversation[]> {
    return request<Conversation[]>(
      `/api/conversations?userId=${encodeURIComponent(userId)}`
    );
  },

  createConversation(payload: {
    name: string;
    type: ConversationType;
    userIds: string[];
    createdBy?: string;
  }): Promise<Conversation> {
    return request<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  renameConversation(
    conversationId: string,
    name: string,
    userId: string
  ): Promise<Conversation> {
    return request<Conversation>(
      `/api/conversations/${encodeURIComponent(conversationId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          userId
        })
      }
    );
  },

  deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    return request<void>(
      `/api/conversations/${encodeURIComponent(conversationId)}?userId=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE'
      }
    );
  },

  // -----------------------------
  // Members
  // -----------------------------

  addMember(conversationId: string, userId: string) {
    return request(
      `/api/conversations/${encodeURIComponent(conversationId)}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ userId })
      }
    );
  },

  getMembers(conversationId: string): Promise<string[]> {
    return request<string[]>(
      `/api/conversations/${encodeURIComponent(conversationId)}/members`
    );
  },

  // -----------------------------
  // Messages
  // -----------------------------

  getHistory(conversationId: string): Promise<ChatMessage[]> {
    return request<ChatMessage[]>(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`
    );
  },

  // -----------------------------
  // Presence
  // -----------------------------

  getPresence(userId: string): Promise<Presence> {
    return request<Presence>(
      `/api/presence/${encodeURIComponent(userId)}`
    );
  }
};