package com.dakshin.chat.controller;

import com.dakshin.chat.dto.ChatMessageResponse;
import com.dakshin.chat.service.ChatMessageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
public class HistoryController {

    private final ChatMessageService chatMessageService;

    public HistoryController(ChatMessageService chatMessageService) {
        this.chatMessageService = chatMessageService;
    }

    @GetMapping("/{conversationId}/messages")
    public List<ChatMessageResponse> getHistory(@PathVariable UUID conversationId) {
        return chatMessageService.getHistory(conversationId);
    }
}
