# Distributed Chat Application — Backend

Spring Boot backend for the distributed real-time chat application.

## Runtime

- Java 21
- Spring Boot 4.1.1
- PostgreSQL 18
- Redis 7
- Raw WebSocket
- Docker / Docker Compose
- Nginx reverse proxy

The stack runs two application instances (`server-1` and `server-2`) sharing PostgreSQL and Redis.

## REST API

```text
GET  /api/conversations?userId={userId}
POST /api/conversations
POST /api/conversations/{conversationId}/members
GET  /api/conversations/{conversationId}/members
GET  /api/conversations/{conversationId}/messages
GET  /api/presence/{userId}
```

### Create conversation

```json
{
  "name": "Project Team",
  "type": "GROUP",
  "userIds": ["alice", "bob", "charlie"]
}
```

For `DIRECT`, exactly two distinct members are required.

### WebSocket

```text
ws://localhost/ws/chat?userId=alice&conversationId=<conversation-uuid>
```

Client message:

```json
{
  "conversationId": "<conversation-uuid>",
  "content": "Hello"
}
```

The WebSocket user identity comes from the `userId` query parameter.

## Run

```bash
mvn spring-boot:run
```

Default port: `8080`.

For the full distributed demo, use the root `docker-compose.yml`, which adds PostgreSQL, Redis, two backend instances, the React production build, and Nginx.
