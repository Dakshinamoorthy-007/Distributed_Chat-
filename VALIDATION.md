# Integration Validation Record

## Executed in this environment

- Backend REST/WebSocket contracts were read from the supplied Java source and compared against the frontend client implementation.
- All expected REST paths are wired.
- The WebSocket URL and client message payload match the supplied backend protocol.
- `CONNECTED`, `MESSAGE`, and server-rejection handling are implemented.
- Nginx REST and WebSocket proxy configuration is wired to the two backend instances.
- Docker Compose contains PostgreSQL, Redis, server-1, server-2, and the integrated frontend/Nginx image build.
- Every frontend `.ts` / `.tsx` source file passed TypeScript syntax/transpilation validation.
- JavaScript validation scripts passed `node --check`.
- No empty files or directories remain in the packaged project.

## Live runtime test included in the package

`distributed-chat-backend/scripts/integration-test.mjs` runs the full flow through `http://localhost:80`:

1. Create GROUP conversation.
2. Add a member.
3. Read members.
4. List the user's conversations.
5. Verify an outsider receives WebSocket policy rejection.
6. Connect three users through Nginx.
7. Verify clients reach both backend server IDs.
8. Verify online presence.
9. Send one real-time message and verify fan-out to all connected members.
10. Verify the message is persisted and returned by history.
11. Disconnect and verify offline presence.

Run it after the Docker stack is available:

```bash
cd distributed-chat-backend
npm install
node scripts/integration-test.mjs
```

## Environment limitation

This packaging environment does **not** provide Maven or Docker, and it cannot reach the npm registry. Therefore the Spring Boot/Docker live stack could not be started here, so a truthful `ALL LIVE INTEGRATION TESTS PASSED` result cannot be claimed from this environment.

The project is packaged with the live test so it can be executed directly on the development machine/CI environment where Docker and Maven are available.

- WebSocket stale-socket callback guard: PASS — superseded sockets cannot schedule duplicate reconnects or overwrite active connection state.
