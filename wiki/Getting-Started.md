# Getting Started

## Prerequisites

- **Node.js** >= 18.0.0
- **Yarn** >= 4.0.0 (Berry) — enable via `corepack enable`
- **Go** >= 1.22 (for microservices, optional for frontend work)
- **Docker** + **Docker Compose** (for local infrastructure)
- **MySQL** client (`mysql` CLI optional but helpful)

## Clone & Install

```bash
git clone https://github.com/bk-leducphuong/TravelNest.git
cd TravelNest

# Enable Yarn Berry (if not already)
corepack enable
corepack prepare yarn@4.5.3 --activate

# Install all workspace dependencies
yarn install
```

## Infrastructure Setup

Start the required services via Docker:

```bash
# Start MySQL + Redis (minimum for API)
docker compose -f server/infra/docker-compose.yml up -d mysql redis

# Or start everything (MySQL, Redis, Elasticsearch, MongoDB, MinIO)
docker compose -f server/infra/docker-compose.yml up -d
```

## Backend Setup

See the detailed [Backend Development](Backend-Development) guide.

```bash
cd server

# Create environment file
cp .env.format .env.development
# Edit .env.development with your local settings

# Create database and run migrations
npm run db:init
npm run migrate

# Seed development data
npm run seed:all:quick

# Start the development server
npm run dev
```

The API will be available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/api-docs`.

## User Client Setup

```bash
cd client

# Create environment file
cp .env.format .env.development.local
# Edit as needed (VITE_API_BASE_URL, etc.)

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Admin Client Setup

```bash
cd admin-client

# Create environment file
cp .env.example .env
# Edit as needed (NUXT_PUBLIC_API_BASE, etc.)

# Start the dev server
npm run dev
```

The admin app will be available at `http://localhost:8000`.

## Go Microservices (Optional)

```bash
# Each service has its own setup; for example:
cd services/analytics
cp .env.format .env
go mod download
go run ./cmd/api
```

## Using Root Workspace Commands

From the repository root, you can use Yarn workspace commands:

```bash
yarn dev:server          # Start backend API
yarn dev:client          # Start user client
yarn dev:admin           # Start admin client
yarn dev:bullmq-worker   # Start background worker
yarn lint                # Lint all packages
yarn test                # Test all packages
```

## Environment Files Reference

| Package | Template File | Key Variables |
|---|---|---|
| `server/` | `.env.format` | `DB_*`, `REDIS_*`, `ES_*`, `STRIPE_*`, `MINIO_*` |
| `client/` | `.env.format` | `VITE_API_BASE_URL`, `VITE_STRIPE_PUBLIC_KEY` |
| `admin-client/` | `.env.example` | `NUXT_PUBLIC_API_BASE` |
| `services/analytics/` | `.env.format` | `NATS_*`, `REDIS_*`, `MONGODB_*` |
| `services/media/` | `.env.format` | `NATS_*`, `MINIO_*`, `MYSQL_*` |
| `services/notification/` | `.env.format` | `NATS_*`, `MYSQL_*`, `SMTP_*` |

## Verify Everything Works

```bash
# Health check the API
curl http://localhost:3000/health

# Run backend tests
cd server && npm test
```

## Next Steps

- [Architecture](Architecture) — understand the system design
- [Backend Development](Backend-Development) — deep dive into the API
- [Frontend Development](Frontend-Development) — learn about the frontends
- [Testing](Testing) — how to run tests across all packages
