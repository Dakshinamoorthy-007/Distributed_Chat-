# Distributed Chat Frontend

React + TypeScript UI for the distributed chat backend.

## Structure

```text
src/
  components/
    ChatWindow.tsx
    ConnectionStatus.tsx
    ConversationList.tsx
    CreateConversationModal.tsx
    MessageInput.tsx
    MessageList.tsx
    UserGate.tsx
  hooks/
    useChatSocket.ts
  services/
    api.ts
    websocket.ts
  styles/
    app.css
  types/
    chat.ts
  App.tsx
  main.tsx
```

The browser uses same-origin `/api` and `/ws` paths. In development, Vite proxies these paths to `http://localhost:80`; in Docker, Nginx serves the built React files and proxies the backend paths to the two Spring Boot instances.
