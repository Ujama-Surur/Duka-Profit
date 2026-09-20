package com.rwandago.modules.auth.dto;

import com.rwandago.modules.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String country;
    private String profileImageUrl;
    private Set<String> roles;
    private boolean isVerified;
    private boolean isActive;

    public static UserDto fromEntity(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toSet());

        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .country(user.getCountry())
                .profileImageUrl(user.getProfileImageUrl())
                .roles(roleNames)
                .isVerified(user.isVerified())
                .isActive(user.isActive())
                .build();
    }
}
