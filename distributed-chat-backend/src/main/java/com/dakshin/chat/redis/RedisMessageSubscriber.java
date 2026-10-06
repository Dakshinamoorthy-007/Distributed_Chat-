package com.dakshin.chat.redis;

import com.dakshin.chat.dto.ChatMessageResponse;
import com.dakshin.chat.websocket.ChatWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class RedisMessageSubscriber {

    private static final Logger log =
            LoggerFactory.getLogger(RedisMessageSubscriber.class);

    private final ObjectMapper objectMapper;
    private final ChatWebSocketHandler chatWebSocketHandler;

    public RedisMessageSubscriber(
            ObjectMapper objectMapper,
            ChatWebSocketHandler chatWebSocketHandler) {

        this.objectMapper = objectMapper;
        this.chatWebSocketHandler = chatWebSocketHandler;
    }

    public void onMessage(String payload) {

        try {
            ChatMessageResponse message =
                    objectMapper.readValue(
                            payload,
                            ChatMessageResponse.class);

            log.info(
                    "Redis message received: conversationId={}, senderId={}",
                    message.conversationId(),
                    message.senderId()
            );

            chatWebSocketHandler.broadcastFromRedis(message);

        } catch (Exception e) {

            log.error(
                    "Failed to process Redis chat message",
                    e
            );
        }
    }
}