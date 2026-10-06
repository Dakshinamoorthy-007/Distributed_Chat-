import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types/chat';

interface CreateConversationModalProps {
  currentUserId: string;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    type: 'DIRECT' | 'GROUP';
    userIds: string[];
    createdBy: string;
  }) => Promise<void>;
}

export function CreateConversationModal({
  currentUserId,
  onClose,
  onCreate
}: CreateConversationModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'DIRECT' | 'GROUP'>('DIRECT');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([
    currentUserId
  ]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    api.listUsers()
      .then((result) => {
        if (!active) return;

        const hasCurrentUser = result.some(
          (user) =>
            user.username.toLowerCase() === currentUserId.toLowerCase()
        );

        setUsers(
          hasCurrentUser
            ? result
            : [
                {
                  id: currentUserId,
                  username: currentUserId,
                  createdAt: ''
                },
                ...result
              ]
        );
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load users.'
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingUsers(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentUserId]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      user.username.toLowerCase().includes(query)
    );
  }, [users, search]);

  const selectedUserObjects = useMemo(
    () =>
      selectedMembers
        .map((username) =>
          users.find(
            (user) =>
              user.username.toLowerCase() === username.toLowerCase()
          )
        )
        .filter((user): user is User => Boolean(user)),
    [selectedMembers, users]
  );

  const isSelected = (username: string) =>
    selectedMembers.some(
      (member) => member.toLowerCase() === username.toLowerCase()
    );

  const isCurrentUser = (username: string) =>
    username.toLowerCase() === currentUserId.toLowerCase();

  const toggleMember = (username: string) => {
    if (isCurrentUser(username) || saving) {
      return;
    }

    setSelectedMembers((current) => {
      const alreadySelected = current.some(
        (member) => member.toLowerCase() === username.toLowerCase()
      );

      if (alreadySelected) {
        return current.filter(
          (member) => member.toLowerCase() !== username.toLowerCase()
        );
      }

      if (type === 'DIRECT') {
        return [currentUserId, username];
      }

      return [...current, username];
    });
  };

  const removeMember = (username: string) => {
    if (isCurrentUser(username)) {
      return;
    }

    setSelectedMembers((current) =>
      current.filter(
        (member) => member.toLowerCase() !== username.toLowerCase()
      )
    );
  };

  const handleTypeChange = (nextType: 'DIRECT' | 'GROUP') => {
    setType(nextType);
    setError(null);

    if (nextType === 'DIRECT') {
      const firstOtherUser = users.find(
        (user) => !isCurrentUser(user.username)
      );

      setSelectedMembers(
        firstOtherUser
          ? [currentUserId, firstOtherUser.username]
          : [currentUserId]
      );
    } else {
      setSelectedMembers([currentUserId]);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(
        type === 'GROUP'
          ? 'Enter a group name.'
          : 'Enter a conversation name.'
      );
      return;
    }

    const uniqueUserIds = [
      ...new Set([currentUserId, ...selectedMembers])
    ];

    if (type === 'DIRECT' && uniqueUserIds.length !== 2) {
      setError('Select one person to start a direct chat.');
      return;
    }

    if (type === 'GROUP' && uniqueUserIds.length < 2) {
      setError('Select at least one other person.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onCreate({
        name: trimmedName,
        type,
        userIds: uniqueUserIds,
        createdBy: currentUserId
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Conversation could not be created.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="modal-card conversation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">
              {type === 'GROUP' ? 'New group' : 'New conversation'}
            </p>

            <h2 id="conversation-modal-title">
              {type === 'GROUP'
                ? 'Create a group'
                : 'Start a direct chat'}
            </h2>
          </div>

          <button
            className="icon-button modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="stack-form" onSubmit={submit}>
          <div className="conversation-type-toggle">
            <button
              type="button"
              className={type === 'DIRECT' ? 'active' : ''}
              onClick={() => handleTypeChange('DIRECT')}
              disabled={saving}
            >
              Direct
            </button>

            <button
              type="button"
              className={type === 'GROUP' ? 'active' : ''}
              onClick={() => handleTypeChange('GROUP')}
              disabled={saving}
            >
              Group
            </button>
          </div>

          <div className="field-block">
            <label htmlFor="conversationName">
              {type === 'GROUP' ? 'Group name' : 'Conversation name'}
            </label>

            <input
              id="conversationName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                type === 'GROUP'
                  ? 'e.g. Distributed Systems'
                  : 'e.g. Alice & Bob'
              }
              disabled={saving}
              autoComplete="off"
            />
          </div>

          <div className="member-section">
            <div className="member-section-header">
              <div>
                <label>
                  {type === 'GROUP'
                    ? 'People'
                    : 'Select a person'}
                </label>

                <span>
                  {type === 'GROUP'
                    ? `${selectedMembers.length} selected`
                    : 'Choose one person'}
                </span>
              </div>
            </div>

            {type === 'GROUP' && selectedUserObjects.length > 0 && (
              <div className="selected-members">
                {selectedUserObjects.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="selected-member"
                    onClick={() => removeMember(user.username)}
                    disabled={
                      saving || isCurrentUser(user.username)
                    }
                    title={
                      isCurrentUser(user.username)
                        ? 'You are the group creator'
                        : `Remove ${user.username}`
                    }
                  >
                    <span className="selected-member-avatar">
                      {user.username.slice(0, 1).toUpperCase()}
                    </span>

                    <span>{user.username}</span>

                    {!isCurrentUser(user.username) && (
                      <span className="selected-member-remove">
                        ×
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="member-search">
              <span aria-hidden="true">⌕</span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people"
                disabled={saving || loadingUsers}
                aria-label="Search people"
              />
            </div>

            <div className="member-directory">
              {loadingUsers ? (
                <div className="directory-state">
                  Loading people…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="directory-state">
                  No people match “{search}”.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const selected = isSelected(user.username);
                  const current = isCurrentUser(user.username);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`person-row ${
                        selected ? 'selected' : ''
                      }`}
                      onClick={() => toggleMember(user.username)}
                      disabled={current || saving}
                    >
                      <span className="person-avatar">
                        {user.username.slice(0, 1).toUpperCase()}
                        <span className="person-status" />
                      </span>

                      <span className="person-details">
                        <strong>{user.username}</strong>

                        <small>
                          {current
                            ? 'You'
                            : selected
                              ? 'Selected'
                              : 'Available'}
                        </small>
                      </span>

                      <span
                        className={`selection-indicator ${
                          selected ? 'checked' : ''
                        }`}
                        aria-hidden="true"
                      >
                        {selected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {type === 'GROUP' && (
            <p className="form-note">
              You’re automatically included as the group creator.
            </p>
          )}

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={
                saving ||
                loadingUsers ||
                (type === 'DIRECT' && selectedMembers.length !== 2) ||
                (type === 'GROUP' && selectedMembers.length < 2)
              }
            >
              {saving
                ? 'Creating…'
                : type === 'GROUP'
                  ? 'Create group'
                  : 'Start chat'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}