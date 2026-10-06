package com.dakshin.chat.service;

import com.dakshin.chat.entity.User;
import com.dakshin.chat.repository.ConversationMemberRepository;
import com.dakshin.chat.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ConversationMemberRepository memberRepository;

    public UserService(
            UserRepository userRepository,
            ConversationMemberRepository memberRepository) {

        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public User createUser(String username) {

        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException(
                    "Username is required");
        }

        String normalizedUsername = username.trim();

        if (normalizedUsername.length() > 100) {
            throw new IllegalArgumentException(
                    "Username must not exceed 100 characters");
        }

        if (userRepository.existsByUsernameIgnoreCase(
                normalizedUsername)) {

            throw new IllegalArgumentException(
                    "Username already exists");
        }

        return userRepository.save(
                new User(normalizedUsername));
    }

    @Transactional
    public List<User> getUsers() {

        /*
         * Existing conversations may contain users that were created
         * before the users table was introduced.
         *
         * Example:
         * conversation_members -> alice, bob
         * users table            -> empty
         *
         * Synchronize those legacy users into the users table first.
         */
        syncLegacyUsers();

        return userRepository.findAll()
                .stream()
                .sorted(
                        Comparator.comparing(
                                User::getUsername,
                                String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean exists(String username) {

        if (username == null || username.isBlank()) {
            return false;
        }

        return userRepository.existsByUsernameIgnoreCase(
                username.trim());
    }

    private void syncLegacyUsers() {

      List<String> memberUserIds =
        memberRepository.findDistinctUserIds();

        for (String userId : memberUserIds) {

            if (userId == null || userId.isBlank()) {
                continue;
            }

            String normalizedUserId = userId.trim();

            if (!userRepository.existsByUsernameIgnoreCase(
                    normalizedUserId)) {

                userRepository.save(
                        new User(normalizedUserId));
            }
        }
    }
}