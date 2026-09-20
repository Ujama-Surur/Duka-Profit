package com.rwandago;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rwandago.modules.auth.dto.LoginRequest;
import com.rwandago.modules.auth.dto.RegisterRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class RwandaGoApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Context loads successfully")
    void contextLoads() {
    }

    @Test
    @DisplayName("Seeded admin account can login and receive JWT tokens")
    void adminCanLogin() throws Exception {
        LoginRequest loginRequest = LoginRequest.builder()
                .email("admin@rwandago.rw")
                .password("AdminRwandaGo2026!")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.refreshToken", notNullValue()))
                .andExpect(jsonPath("$.data.user.email", is("admin@rwandago.rw")))
                .andExpect(jsonPath("$.data.user.roles", hasItem("ROLE_ADMIN")));
    }

    @Test
    @DisplayName("New traveler can register and get JWT tokens")
    void travelerCanRegister() throws Exception {
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email("newtraveler@example.com")
                .password("SecurePass2026!")
                .firstName("Kwizera")
                .lastName("Gael")
                .country("Rwanda")
                .phone("+250788990011")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.accessToken", notNullValue()))
                .andExpect(jsonPath("$.data.user.email", is("newtraveler@example.com")));
    }

    @Test
    @DisplayName("Public destinations endpoint returns seeded destinations")
    void getDestinations() throws Exception {
        mockMvc.perform(get("/api/v1/destinations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$.data[0].name", notNullValue()));
    }
}
