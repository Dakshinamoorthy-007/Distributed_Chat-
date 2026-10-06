package com.dakshin.chat.controller;

import com.dakshin.chat.service.RedisPresenceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/presence")
public class PresenceController {

    private final RedisPresenceService redisPresenceService;

    public PresenceController(
            RedisPresenceService redisPresenceService) {

        this.redisPresenceService =
                redisPresenceService;
    }

    @GetMapping("/{userId}")
    public Map<String, Object> getPresence(
            @PathVariable String userId) {

        boolean online =
                redisPresenceService.isOnline(userId);

        return Map.of(
                "userId",
                userId,

                "online",
                online
        );
    }
}