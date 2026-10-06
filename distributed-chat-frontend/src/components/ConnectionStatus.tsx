import type { ChatSocketStatus } from '../services/websocket';

const labels: Record<ChatSocketStatus, string> = {
  DISCONNECTED: 'Disconnected',
  CONNECTING: 'Connecting…',
  CONNECTED: 'Connected',
  RECONNECTING: 'Reconnecting…'
};

export function ConnectionStatus({ status }: { status: ChatSocketStatus }) {
  return (
    <span className={`connection-status status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {labels[status]}
    </span>
  );
}
