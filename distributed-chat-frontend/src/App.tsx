import { useCallback, useEffect, useState } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { ConversationList } from './components/ConversationList';
import { CreateConversationModal } from './components/CreateConversationModal';
import { UserGate } from './components/UserGate';
import { useChatSocket } from './hooks/useChatSocket';
import { api } from './services/api';
import type { ChatMessage, Conversation, Presence, SocketEvent } from './types/chat';

const STORAGE_KEY = 'distributed-chat-user-id';
function getMessageTime(value: string | number): number {
  if (typeof value === 'number') {
    return value < 10_000_000_000
      ? value * 1000
      : value;
  }

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (left, right) =>
      getMessageTime(left.createdAt) -
      getMessageTime(right.createdAt)
  );
}

function mergeMessage(messages: ChatMessage[], incoming: ChatMessage) {
  if (messages.some((message) => message.id === incoming.id)) return messages;
  return sortMessages([...messages, incoming]);
}

function App() {
  const [userId, setUserId] = useState<string | null>(() => sessionStorage  .getItem(STORAGE_KEY));
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const [members, setMembers] = useState<string[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationReady, setConversationReady] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const refreshConversations = useCallback(async () => {
    if (!userId) return;
    setLoadingConversations(true);
    setPageError(null);
    try {
      const result = await api.listConversations(userId);
      setConversations(result);
      setSelectedConversation((current) => current && result.some((item) => item.id === current.id) ? result.find((item) => item.id === current.id) ?? current : result[0] ?? null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);

  useEffect(() => { void refreshConversations(); }, [refreshConversations]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setMembers([]);
      setPresence({});
      setConversationReady(false);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    setConversationReady(false);
    setPageError(null);
    setMessages([]);

    void Promise.all([
      api.getHistory(selectedConversation.id),
      api.getMembers(selectedConversation.id)
    ]).then(async ([history, memberIds]) => {
      if (cancelled) return;
      setMessages(sortMessages(history));
      setMembers(memberIds);
      setConversationReady(true);
      const presenceResults = await Promise.all(memberIds.map((memberId) => api.getPresence(memberId)));
      if (!cancelled) setPresence(Object.fromEntries(presenceResults.map((item) => [item.userId, item])));
    }).catch((error) => {
      if (!cancelled) {
        setConversationReady(false);
        setPageError(error instanceof Error ? error.message : 'Unable to load conversation.');
      }
    }).finally(() => {
      if (!cancelled) setLoadingMessages(false);
    });

    return () => { cancelled = true; };
  }, [selectedConversation]);


  const handleSocketEvent = useCallback((event: SocketEvent) => {
    if (event.type === 'CONNECTED') {
      // A reconnect may have missed messages while the socket was down.
      // Merge persisted history into the current state without dropping a
      // live message that may arrive while the history request is in flight.
      void api.getHistory(event.conversationId).then((history) => {
        setMessages((current) => {
          const merged = history.reduce(mergeMessage, current);
          return sortMessages(merged);
        });
      }).catch(() => {
        // Live WebSocket delivery can continue even when a catch-up read fails.
      });
      return;
    }

    if (event.type === 'MESSAGE') {
      setMessages((current) => mergeMessage(current, event.message));
    }
  }, []);

  const socket = useChatSocket(userId, selectedConversation?.id ?? null, conversationReady, handleSocketEvent);

  useEffect(() => {
    if (!members.length) return;
    const refreshPresence = async () => {
      try {
        const results = await Promise.all(members.map((memberId) => api.getPresence(memberId)));
        setPresence(Object.fromEntries(results.map((item) => [item.userId, item])));
      } catch {
        // Presence is informational; keep the last successful state.
      }
    };

    void refreshPresence();
    const timer = window.setInterval(() => { void refreshPresence(); }, 10000);
    return () => window.clearInterval(timer);
  }, [members]);

  const handleContinue = (nextUserId: string) => {
    sessionStorage.setItem(STORAGE_KEY, nextUserId);
    setSelectedConversation(null);
    setUserId(nextUserId);
  };

  const handleCreate = async (payload: {
    name: string;
    type: 'DIRECT' | 'GROUP';
    userIds: string[];
    createdBy: string;
  }) => {
    const created = await api.createConversation(payload);

    setShowCreate(false);

    await refreshConversations();

    setSelectedConversation(created);
  };

  const currentConversation = selectedConversation;

  if (!userId) {
    return <UserGate initialUserId="alice" onContinue={handleContinue} />;
  }

  return (
    <main className="app-shell">
      <ConversationList
        conversations={conversations}
        selectedId={currentConversation?.id ?? null}
        loading={loadingConversations}
        onSelect={setSelectedConversation}
        onCreate={() => setShowCreate(true)}
      />

      <section className="main-column">
        <header className="topbar">
          <div>
            <span className="eyebrow">Signed in as</span>
            <strong>{userId}</strong>
          </div>
          <button className="secondary-button" type="button" onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setUserId(null); }}>Switch user</button>
        </header>

        {pageError && <div className="error-banner page-error">{pageError}</div>}

        <ChatWindow
          userId={userId}
          conversation={currentConversation}
          messages={messages}
          loading={loadingMessages}
          presence={presence}
          socketStatus={socket.status}
          socketError={socket.error}
          onSend={socket.send}
        />
      </section>

      {showCreate && <CreateConversationModal currentUserId={userId} onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </main>
  );
}

export default App;
