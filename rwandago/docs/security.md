# RwandaGo Security Architecture

## 1. Authentication & Tokens
- **Stateless JWT**: HMAC-SHA256 tokens using 256-bit secret keys.
- **Token Lifespans**:
  - Access Token: 24 hours (configurable).
  - Refresh Token: 30 days, stored securely with revocation capability.
- **Passwords**: Encrypted with BCrypt (cost factor 10-12). Plaintext passwords are never logged or stored.

## 2. Authorization & RBAC
- Role-Based Access Control enforced at the Spring Security filter chain and method level via `@PreAuthorize`.
- Roles: `ROLE_USER`, `ROLE_BUSINESS_OWNER`, `ROLE_TOUR_GUIDE`, `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`.
- Frontend role states are never trusted for server mutations.

## 3. Defense in Depth
- **SQL Injection**: Complete parameter binding through Hibernate & Spring Data JPA.
- **CORS**: Strict allowed origins (`http://localhost:3000`, `https://rwandago.rw`).
- **CSRF**: Disabled for stateless token APIs; secure SameSite cookie options for web sessions.
- **Validation**: Strict server-side Jakarta Bean Validation on all incoming request DTOs.
