package com.dakshin.chat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ServerConfig {

    private final String serverId;

    public ServerConfig(
            @Value("${server.id:server-1}") String serverId) {
        this.serverId = serverId;
    }

    public String getServerId() {
        return serverId;
    }
}