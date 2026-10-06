import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  loading: boolean;
}

function formatTime(value: string | number) {
  const timestamp =
    typeof value === 'number'
      ? value < 10_000_000_000
        ? value * 1000
        : value
      : value;

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function MessageList({
  messages,
  currentUserId,
  loading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
    });
  }, [messages]);

  if (loading) {
    return <div className="message-state">Loading message history…</div>;
  }

  if (!messages.length) {
    return (
      <div className="message-state">
        <strong>No messages yet.</strong>
        <span>Send the first message in this conversation.</span>
      </div>
    );
  }

  return (
    <div className="message-scroll">
      <div className="message-list">
        {messages.map((message) => {
          const own = message.senderId === currentUserId;

          return (
            <article
              className={`message-row ${own ? 'own' : ''}`}
              key={message.id}
            >
              {!own && (
                <div className="mini-avatar">
                  {message.senderId.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="message-bubble">
                <div className="message-meta">
                  <strong>{own ? 'You' : message.senderId}</strong>
                  <time>{formatTime(message.createdAt)}</time>
                </div>

                <p>{message.content}</p>
              </div>
            </article>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}