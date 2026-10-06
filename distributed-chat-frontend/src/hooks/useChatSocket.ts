import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatSocket, type ChatSocketStatus } from '../services/websocket';
import type { SocketEvent } from '../types/chat';

export function useChatSocket(userId: string | null, conversationId: string | null, enabled: boolean, onEvent: (event: SocketEvent) => void) {
  const [status, setStatus] = useState<ChatSocketStatus>('DISCONNECTED');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ChatSocket | null>(null);
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;

    if (!userId || !conversationId || !enabled) {
      setStatus('DISCONNECTED');
      return;
    }

    const socket = new ChatSocket({
      userId,
      conversationId,
      onEvent: (event) => {
        if (event.type === 'CONNECTED') {
          setError(null);
          setStatus('CONNECTED');
        } else if (event.type === 'ERROR') {
          setError(event.error ?? 'The server rejected the request.');
        }
        handlerRef.current(event);
      },
      onStatus: setStatus,
      onError: setError
    });

    socketRef.current = socket;
    socket.connect();

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [userId, conversationId, enabled]);

  const send = useCallback((content: string) => socketRef.current?.send(content) ?? false, []);

  return { status, error, send };
}
