export type ConversationType = 'DIRECT' | 'GROUP';

export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  name: string;
  type: ConversationType;
  createdAt: string;
  createdBy?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string | number;
}

export interface Presence {
  userId: string;
  online: boolean;
}

export interface ConnectedEvent {
  type: 'CONNECTED';
  userId: string;
  serverId: string;
  serverSessionId: string;
  conversationId: string;
}

export interface MessageEvent {
  type: 'MESSAGE';
  message: ChatMessage;
}

export interface ErrorEvent {
  type: 'ERROR';
  error?: string;
}

export type SocketEvent = ConnectedEvent | MessageEvent | ErrorEvent;