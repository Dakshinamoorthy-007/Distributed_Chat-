package com.dakshin.chat.service;

import com.dakshin.chat.entity.Conversation;
import com.dakshin.chat.entity.ConversationMember;
import com.dakshin.chat.entity.ConversationType;
import com.dakshin.chat.repository.ConversationMemberRepository;
import com.dakshin.chat.repository.ConversationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository memberRepository;
    private final UserService userService;

    public ConversationService(
            ConversationRepository conversationRepository,
            ConversationMemberRepository memberRepository,
            UserService userService) {

        this.conversationRepository = conversationRepository;
        this.memberRepository = memberRepository;
        this.userService = userService;
    }

    @Transactional
    public Conversation createConversation(
            String name,
            ConversationType type,
            List<String> userIds,
            String createdBy) {

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                    "Conversation name is required");
        }

        if (type == null) {
            throw new IllegalArgumentException(
                    "Conversation type is required");
        }

        if (userIds == null || userIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one conversation member is required");
        }

        List<String> normalizedUserIds =
                userIds.stream()
                        .filter(userId ->
                                userId != null
                                        && !userId.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();

        if (normalizedUserIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one valid conversation member is required");
        }

        for (String userId : normalizedUserIds) {

                if (!userService.exists(userId)) {
                        throw new IllegalArgumentException(
                        "User not found: " + userId);
                }
        }

        if (type == ConversationType.DIRECT
                && normalizedUserIds.size() != 2) {

            throw new IllegalArgumentException(
                    "A direct conversation must have exactly two members");
        }

        String normalizedCreatedBy =
        createdBy == null || createdBy.isBlank()
                ? normalizedUserIds.get(0)
                : createdBy.trim();

        if (!normalizedUserIds.contains(normalizedCreatedBy)) {
                throw new IllegalArgumentException(
                "Conversation creator must be a conversation member");
        }

        Conversation conversation =
                conversationRepository.save(
                        new Conversation(name,
                                         type, 
                                         normalizedCreatedBy));

        normalizedUserIds.forEach(userId ->
                memberRepository.save(
                        new ConversationMember(
                                conversation.getId(),
                                userId)));

        return conversation;
    }

    @Transactional
    public ConversationMember addMember(
            UUID conversationId,
            String userId) {

        validateUserId(userId);
        if (!userService.exists(userId)) {
                throw new IllegalArgumentException(
                "User not found: " + userId.trim());
        }

        Conversation conversation =
                conversationRepository.findById(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Conversation not found"));

        if (memberRepository
                .existsByConversationIdAndUserId(
                        conversationId,
                        userId)) {

            throw new IllegalArgumentException(
                    "User is already a conversation member");
        }

        return memberRepository.save(
                new ConversationMember(
                        conversation.getId(),
                        userId.trim()));
    }

    @Transactional(readOnly = true)
    public boolean isMember(
            UUID conversationId,
            String userId) {

        if (userId == null || userId.isBlank()) {
            return false;
        }

        if (!conversationRepository.existsById(conversationId)) {
            return false;
        }

        return memberRepository
                .existsByConversationIdAndUserId(
                        conversationId,
                        userId.trim());
    }

    @Transactional(readOnly = true)
    public List<Conversation> getConversationsForUser(String userId) {
        validateUserId(userId);

        return memberRepository.findByUserId(userId.trim()).stream()
                .map(ConversationMember::getConversationId)
                .distinct()
                .map(conversationRepository::findById)
                .flatMap(java.util.Optional::stream)
                .sorted(Comparator.comparing(Conversation::getCreatedAt).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> getMembers(
            UUID conversationId) {

        if (!conversationRepository.existsById(conversationId)) {
            throw new IllegalArgumentException(
                    "Conversation not found");
        }

        return memberRepository
                .findByConversationId(conversationId)
                .stream()
                .map(ConversationMember::getUserId)
                .toList();
    }

    private void validateUserId(String userId) {

        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException(
                    "User ID is required");
        }
    }
}