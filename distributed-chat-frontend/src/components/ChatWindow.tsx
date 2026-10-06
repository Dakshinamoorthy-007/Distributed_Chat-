import type { Conversation, ChatMessage, Presence } from '../types/chat';
import type { ChatSocketStatus } from '../services/websocket';
import { ConnectionStatus } from './ConnectionStatus';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';

interface ChatWindowProps {
  userId: string;
  conversation: Conversation | null;
  messages: ChatMessage[];
  loading: boolean;
  presence: Record<string, Presence>;
  socketStatus: ChatSocketStatus;
  socketError: string | null;
  onSend: (content: string) => boolean;
}

export function ChatWindow({ userId, conversation, messages, loading, presence, socketStatus, socketError, onSend }: ChatWindowProps) {
  if (!conversation) {
    return (
      <section className="chat-panel empty-chat">
        <div className="empty-chat-icon">◎</div>
        <h2>Select a conversation</h2>
        <p>Choose a chat from the left to load history and open its real-time WebSocket channel.</p>
      </section>
    );
  }

  const onlineMembers = Object.values(presence).filter((item) => item.online).map((item) => item.userId).filter((id) => id !== userId);
  const presenceText = onlineMembers.length === 0 ? 'No other members online' : `${onlineMembers.length} member${onlineMembers.length > 1 ? 's' : ''} online`;

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div>
          <div className="chat-title-row"><h1>{conversation.name}</h1><span className="type-pill">{conversation.type}</span></div>
          <p>{presenceText}</p>
        </div>
        <ConnectionStatus status={socketStatus} />
      </header>

      {socketError && <div className="error-banner chat-error">{socketError}</div>}
      <MessageList messages={messages} currentUserId={userId} loading={loading} />
      <MessageInput disabled={socketStatus !== 'CONNECTED'} onSend={onSend} />
    </section>
  );
}
