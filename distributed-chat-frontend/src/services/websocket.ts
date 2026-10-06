import type {
  ChatMessage,
  ConnectedEvent,
  ErrorEvent,
  MessageEvent,
  SocketEvent
} from '../types/chat';

export interface ChatSocketOptions {
  userId: string;
  conversationId: string;
  onEvent: (event: SocketEvent) => void;
  onStatus: (status: ChatSocketStatus) => void;
  onError: (error: string) => void;
}

export type ChatSocketStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;

  return (
    isString(value.id) &&
    isString(value.conversationId) &&
    isString(value.senderId) &&
    isString(value.content) &&
    (
      isString(value.createdAt) ||
      typeof value.createdAt === 'number'
    )
  );
} 

function parseSocketEvent(data: string): SocketEvent | null {
  const parsed: unknown = JSON.parse(data);

  if (!isRecord(parsed) || !isString(parsed.type)) {
    throw new Error('WebSocket event is missing a valid type.');
  }

  switch (parsed.type) {
    case 'CONNECTED': {
      const event: ConnectedEvent = {
        type: 'CONNECTED',
        userId: String(parsed.userId ?? ''),
        serverId: String(parsed.serverId ?? ''),
        serverSessionId: String(parsed.serverSessionId ?? ''),
        conversationId: String(parsed.conversationId ?? '')
      };

      if (
        !event.userId ||
        !event.serverId ||
        !event.serverSessionId ||
        !event.conversationId
      ) {
        throw new Error('CONNECTED event is missing required fields.');
      }

      return event;
    }

    case 'MESSAGE': {
      if (!isChatMessage(parsed.message)) {
        throw new Error('MESSAGE event contains an invalid message payload.');
      }

      const event: MessageEvent = {
        type: 'MESSAGE',
        message: parsed.message
      };
      return event;
    }

    case 'ERROR': {
      const event: ErrorEvent = {
        type: 'ERROR',
        error: isString(parsed.error) ? parsed.error : undefined
      };
      return event;
    }

    default:
      return null;
  }
}

export class ChatSocket {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private stopped = false;

  constructor(private readonly options: ChatSocketOptions) {}

  connect() {
    this.stopped = false;
    this.clearReconnectTimer();
    this.open(false);
  }

  disconnect() {
    this.stopped = true;
    this.clearReconnectTimer();
    this.reconnectAttempt = 0;

    const current = this.socket;
    this.socket = null;
    if (current) {
      current.close(1000, 'Client switched conversation');
    }

    this.options.onStatus('DISCONNECTED');
  }

  send(content: string) {
    const conversationId = this.options.conversationId;
    const payload = JSON.stringify({ conversationId, content });

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.options.onError('The chat connection is not ready.');
      return false;
    }

    this.socket.send(payload);
    return true;
  }

  private open(isReconnect: boolean) {
    if (this.stopped) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/chat?userId=${encodeURIComponent(this.options.userId)}&conversationId=${encodeURIComponent(this.options.conversationId)}`;

    this.options.onStatus(isReconnect ? 'RECONNECTING' : 'CONNECTING');
    const next = new WebSocket(url);
    this.socket = next;

    next.onopen = () => {
      if (this.socket !== next) return;
      this.reconnectAttempt = 0;
    };

    next.onmessage = (message) => {
      if (this.socket !== next) return;

      try {
        const event = parseSocketEvent(message.data);
        if (event) {
          this.options.onEvent(event);
        }
      } catch {
        this.options.onError('Received an invalid message from the server.');
      }
    };

    next.onerror = () => {
      // A socket can fail after it has already been superseded by a newer
      // connection (for example during a refresh or conversation switch).
      // Ignore stale socket callbacks so they cannot overwrite the current
      // connection state or trigger a reconnect for the wrong socket.
      if (this.socket !== next || this.stopped) return;
      this.options.onError('WebSocket connection error.');
    };

    next.onclose = (event) => {
      // Ignore callbacks from an older socket. This is important when the
      // previous socket is still closing while a replacement socket is being
      // established. Without this guard, the stale socket can schedule an
      // unnecessary reconnect and produce duplicate WebSocket connections.
      if (this.socket !== next) return;

      this.socket = null;

      if (event.code === 1007 || event.code === 1008) {
        this.stopped = true;
        this.clearReconnectTimer();
        this.options.onStatus('DISCONNECTED');
        this.options.onError(
          event.reason || 'The server rejected this chat connection. Check that the user belongs to the conversation.'
        );
        return;
      }

      if (!this.stopped) {
        this.scheduleReconnect();
      } else {
        this.options.onStatus('DISCONNECTED');
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null) return;

    this.reconnectAttempt += 1;
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempt - 1), 10000);
    this.options.onStatus('RECONNECTING');
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open(true);
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
