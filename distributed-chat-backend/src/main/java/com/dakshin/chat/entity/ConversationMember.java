package com.dakshin.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversation_members")
public class ConversationMember {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    protected ConversationMember() {
    }

    public ConversationMember(
            UUID conversationId,
            String userId) {

        this.id = UUID.randomUUID();
        this.conversationId = conversationId;
        this.userId = userId;
        this.joinedAt = Instant.now();
    }

    @PrePersist
    void prePersist() {

        if (id == null) {
            id = UUID.randomUUID();
        }

        if (joinedAt == null) {
            joinedAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public String getUserId() {
        return userId;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }
}