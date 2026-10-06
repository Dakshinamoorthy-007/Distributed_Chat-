package com.dakshin.chat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConversationType type;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    protected Conversation() {
    }

    public Conversation(
            String name,
            ConversationType type,
            String createdBy) {

        this.id = UUID.randomUUID();
        this.name = name;
        this.type = type;
        this.createdBy=createdBy;
        this.createdAt = Instant.now();
    }

    @PrePersist
    void prePersist() {

        if (id == null) {
            id = UUID.randomUUID();
        }

        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public ConversationType getType() {
        return type;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
    public String getCreatedBy() {
        return createdBy;
    }
    public void setName(String name) {
        this.name = name;
    }
}