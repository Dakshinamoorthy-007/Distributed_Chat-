package com.dakshin.chat.service;

import com.dakshin.chat.dto.ChatMessageRequest;
import com.dakshin.chat.dto.ChatMessageResponse;
import com.dakshin.chat.entity.ChatMessage;
import com.dakshin.chat.redis.RedisMessagePublisher;
import com.dakshin.chat.repository.ChatMessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final RedisMessagePublisher redisMessagePublisher;

    public ChatMessageService(
            ChatMessageRepository chatMessageRepository,
            RedisMessagePublisher redisMessagePublisher) {

        this.chatMessageRepository = chatMessageRepository;
        this.redisMessagePublisher = redisMessagePublisher;
    }

    @Transactional
    public ChatMessageResponse saveMessage(
            String senderId,
            ChatMessageRequest request) {

        ChatMessage message =
                new ChatMessage(
                        request.conversationId(),
                        senderId,
                        request.content()
                );

        ChatMessage saved =
                chatMessageRepository.save(message);

        ChatMessageResponse response =
                new ChatMessageResponse(
                        saved.getId(),
                        saved.getConversationId(),
                        saved.getSenderId(),
                        saved.getContent(),
                        saved.getCreatedAt()
                );

        /*
         * PostgreSQL remains the durable source of truth.
         * Redis distributes the successfully persisted message
         * to all application server instances.
         */
        redisMessagePublisher.publish(response);

        return response;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getHistory(
            UUID conversationId) {

        return chatMessageRepository
                .findTop100ByConversationIdOrderByCreatedAtDesc(
                        conversationId)
                .stream()
                .map(message ->
                        new ChatMessageResponse(
                                message.getId(),
                                message.getConversationId(),
                                message.getSenderId(),
                                message.getContent(),
                                message.getCreatedAt()
                        )
                )
                .toList();
    }
}