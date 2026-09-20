# RwandaGo REST API Specification

## 1. Base URL & Protocol
- Base URL: `/api/v1`
- Protocol: HTTPS / REST / JSON
- Documentation: Swagger UI available at `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON Spec: `http://localhost:8080/v3/api-docs`

## 2. Response Envelope Format

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Request processed successfully",
  "timestamp": "2026-09-16T08:00:00Z"
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Destination not found with slug: nyungwe",
    "details": null
  },
  "timestamp": "2026-09-16T08:00:00Z"
}
```

## 3. Core Endpoints
- `POST /api/v1/auth/register`: Register account
- `POST /api/v1/auth/login`: Login & receive JWT access + refresh tokens
- `POST /api/v1/auth/refresh`: Refresh expired access token
- `GET /api/v1/auth/me`: Fetch authenticated user profile
- `GET /api/v1/destinations`: List destinations
- `GET /api/v1/destinations/featured`: Top featured destinations
- `GET /api/v1/destinations/{slug}`: Single destination details
- `GET /api/v1/attractions`: List attractions (supports `?destinationId=...`)
- `GET /api/v1/attractions/{slug}`: Single attraction details
