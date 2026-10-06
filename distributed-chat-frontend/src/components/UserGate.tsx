import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types/chat';

interface UserGateProps {
  initialUserId: string;
  onContinue: (userId: string) => void;
}

export function UserGate({
  initialUserId,
  onContinue
}: UserGateProps) {
  const [userId, setUserId] = useState(initialUserId);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.listUsers()
      .then((result) => {
        if (active) {
          setUsers(result);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load users.'
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
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const normalized = userId.trim();

    if (normalized) {
      onContinue(normalized);
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();

    const normalized = newUsername.trim();

    if (!normalized) {
      setError('Enter a username.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const created = await api.createUser({
        username: normalized
      });

      setUsers((current) => [...current, created]);
      setUserId(created.username);
      setNewUsername('');
      setShowCreateUser(false);

      onContinue(created.username);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create user.'
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="gate-page">
      <section className="gate-card">
        <div className="brand-mark">DC</div>

        <p className="eyebrow">
          Distributed realtime messaging
        </p>

        <h1>Choose your chat identity</h1>

        <p className="muted">
          Select an existing user or create a new one.
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!showCreateUser ? (
          <>
            <form onSubmit={submit} className="stack-form">
              <label htmlFor="userId">
                User
              </label>

              {loadingUsers ? (
                <p className="muted">
                  Loading users…
                </p>
              ) : users.length > 0 ? (
                <select
                  id="userId"
                  value={userId}
                  onChange={(event) =>
                    setUserId(event.target.value)
                  }
                >
                  <option value="" disabled>
                    Select a user
                  </option>

                  {users.map((user) => (
                    <option
                      key={user.id}
                      value={user.username}
                    >
                      {user.username}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="userId"
                  value={userId}
                  onChange={(event) =>
                    setUserId(event.target.value)
                  }
                  placeholder="alice"
                  autoFocus
                />
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={!userId.trim() || loadingUsers}
              >
                Continue
              </button>
            </form>

            <div className="gate-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setShowCreateUser(true);
                setError('');
              }}
            >
              + Create New User
            </button>
          </>
        ) : (
          <form
            onSubmit={createUser}
            className="stack-form"
          >
            <label htmlFor="newUsername">
              Username
            </label>

            <input
              id="newUsername"
              value={newUsername}
              onChange={(event) =>
                setNewUsername(event.target.value)
              }
              placeholder="charlie"
              autoFocus
              disabled={creating}
            />

            <button
              className="primary-button"
              type="submit"
              disabled={!newUsername.trim() || creating}
            >
              {creating ? 'Creating…' : 'Create User'}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setShowCreateUser(false);
                setNewUsername('');
                setError('');
              }}
              disabled={creating}
            >
              Cancel
            </button>
          </form>
        )}
      </section>
    </main>
  );
}