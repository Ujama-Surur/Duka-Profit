# RwandaGo 🇷🇼 — Discover Rwanda: Travel, Stay, Explore & Plan

> **Discover Rwanda. Your way.**  
> *Stay. Explore. Experience Rwanda.*

RwandaGo is an enterprise tourism discovery, accommodation marketplace, trip-planning, and booking platform engineered for Rwanda. It helps international, regional, and domestic travelers explore destinations, discover attractions, plan day-by-day itineraries, estimate budgets, and connect directly with verified tourism businesses.

---

## 🏛️ System Architecture

- **Backend**: Spring Boot 3 (Java 17), Spring Security 6, Spring Data JPA, Hibernate, JJWT 0.12.6, PostgreSQL + PostGIS, H2 in-memory dev profile.
- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide Icons, TanStack Query.
- **Deployment**: Docker Compose orchestrating PostgreSQL + PostGIS, Spring Boot API, and Next.js Web App.

---

## 🚀 Quick Start (Development Mode)

### Prerequisites
- **Java 17+** (Adoptium Eclipse Temurin JDK 17 installed)
- **Node.js 18+** (Node v24 and npm 11 installed)
- **Maven 3.9+** (Installed in `C:\Users\ujama\maven` and added to PATH)

---

### 1. Running the Spring Boot Backend

```bash
cd rwandago/backend
mvn spring-boot:run
```

- **Backend API**: `http://localhost:8080`
- **Swagger / OpenAPI 3.0 Documentation**: `http://localhost:8080/swagger-ui.html`
- **H2 Database Console**: `http://localhost:8080/h2-console` (`JDBC URL: jdbc:h2:mem:rwandagodb`, `User: sa`, `Password: [empty]`)

---

### 2. Running the Next.js Frontend

```bash
cd rwandago/frontend
npm run dev
```

- **Frontend Application**: `http://localhost:3000`

---

## 🔑 Pre-Seeded Demonstration Accounts

The platform auto-seeds the following verified accounts upon first launch:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Super Admin** | `admin@rwandago.rw` | `AdminRwandaGo2026!` | Verification Desk, Platform Analytics, Moderation |
| **Business Owner** | `partner@rwandago.rw` | `PartnerRwandaGo2026!` | Business Portal, Hotel & Tour Management |
| **Traveler** | `traveler@rwandago.rw` | `TravelerRwandaGo2026!` | Trip Planning, Favorites, Bookings, Reviews |

---

## 🗺️ Seeded Rwanda Destinations & Attractions

- **Kigali City**: Kigali Genocide Memorial, Inzora Rooftop Cafe, Kimironko Market.
- **Musanze & Volcanoes**: Mountain Gorilla Sanctuary, Bisoke Crater Hike, Golden Monkeys.
- **Rubavu & Lake Kivu**: Sandy beaches, sunset kayaking, fresh Sambaza cuisine.
- **Akagera National Park**: Big Five savanna safari, Lake Ihema boat cruise.
- **Nyungwe Montane Forest**: 70m high suspended Canopy Walkway, chimpanzee tracking.
- **Karongi / Kibuye**: Lake Kivu islands and tranquil shores.
- **Huye / Butare**: King's Palace Museum, National Ethnographic Museum.

---

## 🐳 Docker Deployment

To launch the complete production-grade containerized stack (PostgreSQL with PostGIS + Backend + Frontend):

```bash
cd rwandago/docker
docker compose up -d --build
```
