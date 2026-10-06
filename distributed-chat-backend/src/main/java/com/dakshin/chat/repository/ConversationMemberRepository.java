package com.dakshin.chat.repository;

import com.dakshin.chat.entity.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ConversationMemberRepository
        extends JpaRepository<ConversationMember, UUID> {

    boolean existsByConversationIdAndUserId(
            UUID conversationId,
            String userId);

    List<ConversationMember> findByConversationId(
            UUID conversationId);

    List<ConversationMember> findByUserId(
            String userId);

    @Query("SELECT DISTINCT cm.userId FROM ConversationMember cm")
    List<String> findDistinctUserIds();
}