# RwandaGo Database & Relational Model

## 1. Engine & Extensions
- Primary Relational Database: **PostgreSQL 16**
- Spatial Extension: **PostGIS 3.4**
- In-Memory Development: **H2 (PostgreSQL Dialect mode)**

## 2. Standards
- **Primary Keys**: RFC 4122 UUID (`java.util.UUID`) to eliminate ID enumeration attacks and simplify distributed data ingestion.
- **Audit Columns**: `created_at` (timestamp with timezone), `updated_at`.
- **Soft Deletion**: `is_deleted` boolean flag on entities to maintain referential integrity.
- **Indexing Strategy**:
  - Unique index on `users.email` and `destinations.slug`.
  - Spatial index on `geom` / `latitude`, `longitude`.
  - Composite indexes on `(destination_id, is_deleted)` and `(category, price_usd)`.

## 3. Core Tables
- `users`: Core traveler, guide, and admin credentials.
- `roles`: RBAC permissions (`ROLE_USER`, `ROLE_BUSINESS_OWNER`, `ROLE_TOUR_GUIDE`, `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`).
- `destinations`: Rwandan cities, national parks, and lake regions.
- `attractions`: Natural attractions, cultural sites, and memorial centers.
- `activities`: Experiences (Gorilla Trekking, Canopy Walks, Boat Cruises).
- `accommodations` & `rooms`: Lodging properties and room tiers.
- `trips`, `trip_days`, `trip_items`: User-created multi-day travel itineraries.
- `bookings`: Reservations with status lifecycle (`PENDING` -> `CONFIRMED` -> `COMPLETED`).
- `reviews`: Community ratings with `is_verified_booking` flag.
