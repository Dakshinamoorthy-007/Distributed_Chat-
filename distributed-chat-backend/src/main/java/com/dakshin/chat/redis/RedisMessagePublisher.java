package com.dakshin.chat.redis;

import com.dakshin.chat.config.RedisConfig;
import com.dakshin.chat.dto.ChatMessageResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RedisMessagePublisher {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public RedisMessagePublisher(
            RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper) {

        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(ChatMessageResponse message) {

        try {
            String payload =
                    objectMapper.writeValueAsString(message);

            redisTemplate.convertAndSend(
                    RedisConfig.CHAT_CHANNEL,
                    payload
            );

        } catch (JsonProcessingException e) {
            throw new IllegalStateException(
                    "Failed to serialize chat message for Redis",
                    e
            );
        }
    }
}