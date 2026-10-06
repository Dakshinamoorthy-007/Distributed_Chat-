import type { Conversation } from '../types/chat';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (conversation: Conversation) => void;
  onCreate: () => void;
}

export function ConversationList({
  conversations,
  selectedId,
  loading,
  onSelect,
  onCreate
}: ConversationListProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-heading">
        <div>
          <p className="eyebrow">Inbox</p>
          <h2>Conversations</h2>
        </div>

        <button
          className="icon-button"
          type="button"
          onClick={onCreate}
          aria-label="Create conversation"
          title="New conversation"
        >
          +
        </button>
      </div>

      <div className="conversation-list">
        {loading && (
          <p className="list-message">
            Loading conversations…
          </p>
        )}

        {!loading && conversations.length === 0 && (
          <div className="empty-panel">
            <p>No conversations yet.</p>

            <button
              className="secondary-button"
              type="button"
              onClick={onCreate}
            >
              Create one
            </button>
          </div>
        )}

        {conversations.map((conversation) => (
          <button
            type="button"
            key={conversation.id}
            className={`conversation-item ${
              selectedId === conversation.id
                ? 'selected'
                : ''
            }`}
            onClick={() => onSelect(conversation)}
          >
            <span className="avatar">
              {conversation.name
                .slice(0, 1)
                .toUpperCase()}
            </span>

            <span className="conversation-copy">
              <strong>{conversation.name}</strong>

              <small>
                {conversation.type === 'GROUP'
                  ? 'Group'
                  : 'Direct'}{' '}
                chat
              </small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}