package com.dakshin.chat.websocket;

import com.dakshin.chat.config.ServerConfig;
import com.dakshin.chat.dto.ChatMessageRequest;
import com.dakshin.chat.dto.ChatMessageResponse;
import com.dakshin.chat.service.ChatMessageService;
import com.dakshin.chat.service.ConversationService;
import com.dakshin.chat.service.RedisPresenceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log =
            LoggerFactory.getLogger(ChatWebSocketHandler.class);

    private static final String ATTR_USER_ID = "userId";
    private static final String ATTR_CONVERSATION_ID = "conversationId";

    private static final String TYPE_CONNECTED = "CONNECTED";
    private static final String TYPE_MESSAGE = "MESSAGE";
    private static final String TYPE_ERROR = "ERROR";

    private final ObjectMapper objectMapper;
    private final ChatMessageService chatMessageService;
    private final Validator validator;
    private final RedisPresenceService redisPresenceService;
    private final ServerConfig serverConfig;
    private final ConversationService conversationService;

    private final Map<String, WebSocketSession> sessions =
            new ConcurrentHashMap<>();

    public ChatWebSocketHandler(
            ObjectMapper objectMapper,
            ChatMessageService chatMessageService,
            RedisPresenceService redisPresenceService,
            ServerConfig serverConfig,
            ConversationService conversationService) {

        this.objectMapper = objectMapper;
        this.chatMessageService = chatMessageService;
        this.redisPresenceService = redisPresenceService;
        this.serverConfig = serverConfig;
        this.conversationService = conversationService;

        this.validator =
                Validation
                        .buildDefaultValidatorFactory()
                        .getValidator();
    }

    @Override
    public void afterConnectionEstablished(
            WebSocketSession session)
            throws Exception {

        String userId =
                extractQueryParameter(
                        session.getUri(),
                        "userId");

        String conversationId =
                extractQueryParameter(
                        session.getUri(),
                        "conversationId");

        if (userId == null || userId.isBlank()) {

            session.close(
                    CloseStatus.BAD_DATA.withReason(
                            "Missing userId query parameter"));

            return;
        }

        if (conversationId == null
                || conversationId.isBlank()) {

            session.close(
                    CloseStatus.BAD_DATA.withReason(
                            "Missing conversationId query parameter"));

            return;
        }

        UUID conversationUuid;

        try {

            conversationUuid =
                    UUID.fromString(conversationId);

        } catch (IllegalArgumentException e) {

            session.close(
                    CloseStatus.BAD_DATA.withReason(
                            "conversationId must be a UUID"));

            return;
        }

        /*
         * A user must be an explicit member of the conversation
         * before a WebSocket connection is accepted.
         */
        if (!conversationService.isMember(
                conversationUuid,
                userId)) {

            log.warn(
                    "Rejected WebSocket connection: serverId={}, userId={}, conversationId={}, reason=user-not-member",
                    serverConfig.getServerId(),
                    userId,
                    conversationId);

            session.close(
                    CloseStatus.POLICY_VIOLATION.withReason(
                            "User is not a member of this conversation"));

            return;
        }

        session.getAttributes().put(
                ATTR_USER_ID,
                userId);

        session.getAttributes().put(
                ATTR_CONVERSATION_ID,
                conversationId);

        redisPresenceService.markOnline(
                userId,
                session.getId());

        WebSocketSession decoratedSession =
                new ConcurrentWebSocketSessionDecorator(
                        session,
                        10_000,
                        512 * 1024);

        sessions.put(
                session.getId(),
                decoratedSession);

        log.info(
                "WebSocket connected: serverId={}, userId={}, sessionId={}, conversationId={}",
                serverConfig.getServerId(),
                userId,
                session.getId(),
                conversationId);

        sendJson(
                session,
                Map.of(
                        "type",
                        TYPE_CONNECTED,

                        "userId",
                        userId,

                        "serverId",
                        serverConfig.getServerId(),

                        "serverSessionId",
                        session.getId(),

                        "conversationId",
                        conversationId
                )
        );
    }

    @Override
    protected void handleTextMessage(
            WebSocketSession session,
            TextMessage message) {

        String userId =
                (String) session
                        .getAttributes()
                        .get(ATTR_USER_ID);

        if (userId == null || userId.isBlank()) {

            sendError(
                    session,
                    "User identity is missing");

            return;
        }

        redisPresenceService.refreshPresence(
                userId,
                session.getId());

        try {

            ChatMessageRequest request =
                    objectMapper.readValue(
                            message.getPayload(),
                            ChatMessageRequest.class);

            Set<ConstraintViolation<ChatMessageRequest>>
                    violations =
                    validator.validate(request);

            if (!violations.isEmpty()) {

                sendError(
                        session,
                        violations
                                .iterator()
                                .next()
                                .getMessage());

                return;
            }

            String subscribedConversationId =
                    (String) session
                            .getAttributes()
                            .get(ATTR_CONVERSATION_ID);

            if (!request.conversationId()
                    .toString()
                    .equals(subscribedConversationId)) {

                sendError(
                        session,
                        "Message conversation does not match the WebSocket conversation");

                return;
            }

            /*
             * The service:
             *
             * 1. Saves the message to PostgreSQL.
             * 2. Publishes the persisted message to Redis.
             *
             * The Redis subscriber performs the actual local
             * WebSocket broadcast on every application server.
             */
            chatMessageService.saveMessage(
                    userId,
                    request);

        } catch (IllegalArgumentException e) {

            sendError(
                    session,
                    e.getMessage());

        } catch (Exception e) {

            log.error(
                    "Failed to process WebSocket message",
                    e);

            sendError(
                    session,
                    "Invalid message payload");
        }
    }

    /**
     * Called by RedisMessageSubscriber when a message
     * arrives from Redis.
     *
     * Every application server receives the Redis event
     * and broadcasts it only to its own connected clients.
     */
    public void broadcastFromRedis(
            ChatMessageResponse message) {

        broadcast(message);
    }

    private void broadcast(
            ChatMessageResponse message) {

        TextMessage outbound;

        try {

            outbound =
                    new TextMessage(
                            objectMapper.writeValueAsString(
                                    Map.of(
                                            "type",
                                            TYPE_MESSAGE,

                                            "message",
                                            message
                                    )
                            )
                    );

        } catch (IOException e) {

            log.error(
                    "Failed to serialize chat message",
                    e);

            return;
        }

        log.info(
                "Broadcasting Redis message locally: conversationId={}, senderId={}, activeSessions={}",
                message.conversationId(),
                message.senderId(),
                sessions.size());

        sessions.values().forEach(session -> {

            try {

                String subscribedConversationId =
                        (String) session
                                .getAttributes()
                                .get(ATTR_CONVERSATION_ID);

                boolean subscribed =
                        subscribedConversationId != null
                                && subscribedConversationId.equals(
                                message.conversationId()
                                        .toString());

                if (subscribed && session.isOpen()) {

                    session.sendMessage(outbound);

                    log.info(
                            "Redis message delivered to sessionId={}",
                            session.getId());
                }

            } catch (IOException e) {

                log.warn(
                        "Failed to send message to session {}",
                        session.getId(),
                        e);
            }
        });
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status) {

        sessions.remove(session.getId());

        String userId =
                (String) session
                        .getAttributes()
                        .get(ATTR_USER_ID);

        if (userId != null) {

            redisPresenceService.markOffline(
                    userId,
                    session.getId());
        }

        log.info(
                "WebSocket disconnected: serverId={}, sessionId={}, userId={}, status={}",
                serverConfig.getServerId(),
                session.getId(),
                userId,
                status);
    }

    private void sendError(
            WebSocketSession session,
            String error) {

        sendJson(
                session,
                Map.of(
                        "type",
                        TYPE_ERROR,

                        "error",
                        error
                )
        );
    }

    private void sendJson(
            WebSocketSession session,
            Object payload) {

        try {

            if (session.isOpen()) {

                session.sendMessage(
                        new TextMessage(
                                objectMapper.writeValueAsString(
                                        payload)
                        )
                );
            }

        } catch (IOException e) {

            log.warn(
                    "Failed to send WebSocket response",
                    e);
        }
    }

    private String extractQueryParameter(
            URI uri,
            String parameterName) {

        if (uri == null
                || uri.getQuery() == null) {

            return null;
        }

        for (String parameter :
                uri.getQuery().split("&")) {

            String[] keyValue =
                    parameter.split("=", 2);

            if (keyValue.length == 2
                    && keyValue[0]
                    .equals(parameterName)) {

                return keyValue[1];
            }
        }

        return null;
    }
}