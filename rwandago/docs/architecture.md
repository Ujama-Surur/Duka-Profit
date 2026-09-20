# RwandaGo Architecture Documentation

## 1. Architectural Philosophy
RwandaGo is architected as an API-first, mobile-ready **Modular Monolith** built on Spring Boot 3 (Java 17) and Next.js 14 App Router.
By eschewing premature microservice fragmentation, the platform delivers high throughput, transactional consistency, simplified DevOps, and clean domain isolation.

## 2. Component Boundaries
```
com.rwandago
├── common/              # Cross-cutting envelopes, BaseEntity, Global Exception Handler
├── config/              # SecurityConfig, CorsConfig, SwaggerConfig
├── security/            # JwtTokenProvider, JwtAuthenticationFilter, UserPrincipal
├── modules/
│   ├── auth/            # Register, Login, Refresh, Me
│   ├── user/            # User & Role domain
│   ├── destination/     # Geo & travel tips
│   ├── attraction/      # National Parks, Museums, Viewpoints
│   ├── activity/        # Tour experiences, pricing, limits
│   ├── accommodation/   # Hotels, Lodges, Room availability
│   ├── restaurant/      # Dining spots & menus
│   ├── transport/       # Airport shuttles, rental 4x4s, drivers
│   ├── trip/            # Multi-day itinerary planner
│   ├── booking/         # Reservation workflow engine
│   ├── review/          # Authenticated review moderation
│   ├── ai/              # Grounded RAG Assistant
│   └── admin/           # Tourism board verification desk
└── seed/                # Production-realistic demo data seeder
```

## 3. Provider Abstractions
- **Storage Abstraction**: `StorageService` interface enables zero-code transition from local disk dev to AWS S3 or Cloudinary.
- **Mapping Provider**: Decoupled from proprietary SDKs; uses standard GeoJSON coordinates with pluggable map tiles (Leaflet/OSM/Mapbox).
- **Payment Gateway**: Generic `PaymentGateway` interface ready for mobile money (MTN MoMo, Airtel Money) and international cards (Stripe, Flutterwave).
- **Currency Service**: Unified conversion rates with base USD and RWF valuation.
