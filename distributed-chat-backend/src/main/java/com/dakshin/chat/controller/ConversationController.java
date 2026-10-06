package com.dakshin.chat.controller;

import com.dakshin.chat.entity.Conversation;
import com.dakshin.chat.entity.ConversationMember;
import com.dakshin.chat.entity.ConversationType;
import com.dakshin.chat.service.ConversationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(
            ConversationService conversationService) {

        this.conversationService = conversationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Conversation createConversation(
            @RequestBody CreateConversationRequest request) {

        return conversationService.createConversation(
                request.name(),
                request.type(),
                request.userIds(),
                request.createdBy());
    }

    @GetMapping
    public List<Conversation> getConversations(@RequestParam String userId) {
        return conversationService.getConversationsForUser(userId);
    }

    @PostMapping("/{conversationId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationMember addMember(
            @PathVariable UUID conversationId,
            @RequestBody AddMemberRequest request) {

        return conversationService.addMember(
                conversationId,
                request.userId());
    }

    @GetMapping("/{conversationId}/members")
    public List<String> getMembers(
            @PathVariable UUID conversationId) {

        return conversationService.getMembers(
                conversationId);
    }

    public record CreateConversationRequest(
            String name,
            ConversationType type,
            List<String> userIds,
            String createdBy) {
    }

    public record AddMemberRequest(
            String userId) {
    }
}