package com.dakshin.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ChatMessageRequest(
        @NotNull UUID conversationId,
        @NotBlank String content
) {
}
