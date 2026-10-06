package com.dakshin.chat.controller;

import com.dakshin.chat.entity.User;
import com.dakshin.chat.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(
            @RequestBody CreateUserRequest request) {

        return userService.createUser(
                request.username());
    }

    @GetMapping
    public List<User> getUsers() {
        return userService.getUsers();
    }

    public record CreateUserRequest(
            String username) {
    }
}