package com.rwandago.modules.auth.service;

import com.rwandago.modules.auth.dto.*;
import com.rwandago.security.UserPrincipal;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(RefreshTokenRequest request);
    UserDto getCurrentUser(UserPrincipal principal);
}
