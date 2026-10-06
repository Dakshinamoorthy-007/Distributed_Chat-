# Distributed Chat Application

A distributed real-time chat application with a React + TypeScript frontend and a Spring Boot backend running across two application instances.

## Architecture

```text
React Frontend
      |
      v
    Nginx :80
      |
  +---+---+
  |       |
Server 1 Server 2
  |       |
  +---+---+
      |
  Redis Pub/Sub
      |
  PostgreSQL
```

## Features

- User identity selection (demo identity, no authentication system)
- Direct and group conversations
- Conversation creation
- Conversation membership
- Message history (latest 100 messages from the existing backend contract)
- Real-time raw WebSocket messaging
- Redis-based cross-server message propagation
- Presence using Redis
- WebSocket reconnect with exponential backoff
- Nginx reverse proxy and WebSocket upgrade
- Docker Compose deployment

## REST contracts used by the frontend

```text
GET  /api/conversations?userId={userId}
POST /api/conversations
POST /api/conversations/{conversationId}/members
GET  /api/conversations/{conversationId}/members
GET  /api/conversations/{conversationId}/messages
GET  /api/presence/{userId}
```

The `GET /api/conversations?userId=...` operation is a small frontend-enablement addition to the supplied backend: the original backend had no read API for listing a user's conversations, so the UI would otherwise have to invent or hard-code conversation IDs.

## WebSocket contract

```text
ws://localhost/ws/chat?userId={userId}&conversationId={conversationId}
```

Send:

```json
{
  "conversationId": "<uuid>",
  "content": "Hello"
}
```

Receive:

```json
{
  "type": "CONNECTED",
  "userId": "alice",
  "serverId": "server-1",
  "serverSessionId": "...",
  "conversationId": "..."
}
```

or:

```json
{
  "type": "MESSAGE",
  "message": {
    "id": "...",
    "conversationId": "...",
    "senderId": "alice",
    "content": "Hello",
    "createdAt": "..."
  }
}
```

## Local development

### Frontend

```bash
cd distributed-chat-frontend
npm install
npm run dev
```

Vite runs at `http://localhost:5173` and proxies `/api` and `/ws` to `http://localhost:80`.

### Backend stack

```bash
# From this project root
cd distributed-chat-backend
mvn spring-boot:run
```

or use the complete Docker Compose stack from the project root:

```bash
docker compose up --build
```

Nginx builds the React frontend image in its first build stage, then serves the generated static files while proxying `/api` and `/ws` to the two Spring Boot instances.

Open `http://localhost`.

## Validation

Frontend build:

```bash
cd distributed-chat-frontend
npm run build
npm run test:smoke
```

The smoke test validates the built artifact and, when the Docker stack is running, checks the conversation REST endpoint and WebSocket handshake through Nginx.

## Demo flow

1. Open the app and choose `alice`.
2. Select an existing conversation or create a new direct/group conversation.
3. History loads before the live socket is opened.
4. The header changes to `Connected` after the backend sends `CONNECTED`.
5. Send a message; it is persisted by PostgreSQL and distributed through Redis to local clients on both backend instances.
6. Open the same conversation as another member in another browser tab.
7. Stop/restart an application server to observe frontend reconnect behavior while the distributed backend continues operating through Nginx.

## Full live validation

After Docker is installed and available:

```bash
docker compose up --build -d
cd distributed-chat-backend
npm install
node scripts/integration-test.mjs
```

The integration test creates its own uniquely named conversation and exercises the REST, WebSocket, presence, membership, persistence, Nginx, and two-server routing paths.

Stop the stack with:

```bash
docker compose down
```
