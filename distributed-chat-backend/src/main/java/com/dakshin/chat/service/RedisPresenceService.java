package com.dakshin.chat.service;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RedisPresenceService {

    private static final String PRESENCE_PREFIX =
            "chat:presence:";

    private static final String CONNECTION_PREFIX =
            "chat:connection:";

    private static final Duration PRESENCE_TTL =
            Duration.ofSeconds(60);

    private static final Duration CONNECTION_TTL =
            Duration.ofSeconds(60);

    private final RedisTemplate<String, Object> redisTemplate;

    public RedisPresenceService(
            RedisTemplate<String, Object> redisTemplate) {

        this.redisTemplate = redisTemplate;
    }

    public void markOnline(
            String userId,
            String sessionId) {

        redisTemplate.opsForValue().set(
                connectionKey(userId, sessionId),
                "CONNECTED",
                CONNECTION_TTL
        );

        redisTemplate.opsForValue().set(
                presenceKey(userId),
                "ONLINE",
                PRESENCE_TTL
        );
    }

    public void refreshPresence(
            String userId,
            String sessionId) {

        String connectionKey =
                connectionKey(userId, sessionId);

        Boolean exists =
                redisTemplate.hasKey(connectionKey);

        if (Boolean.TRUE.equals(exists)) {

            redisTemplate.expire(
                    connectionKey,
                    CONNECTION_TTL
            );

            redisTemplate.expire(
                    presenceKey(userId),
                    PRESENCE_TTL
            );
        }
    }

    public void markOffline(
            String userId,
            String sessionId) {

        redisTemplate.delete(
                connectionKey(userId, sessionId)
        );

        /*
         * We deliberately do not immediately delete
         * the user presence key here.
         *
         * Another server may still have an active
         * connection for the same user.
         */
    }

    public boolean isOnline(String userId) {

        return Boolean.TRUE.equals(
                redisTemplate.hasKey(
                        presenceKey(userId)
                )
        );
    }

    private String presenceKey(
            String userId) {

        return PRESENCE_PREFIX + userId;
    }

    private String connectionKey(
            String userId,
            String sessionId) {

        return CONNECTION_PREFIX
                + userId
                + ":"
                + sessionId;
    }
}