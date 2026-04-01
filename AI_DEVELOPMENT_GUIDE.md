# TravelNest AI Development Guide

> **Purpose**: This guide instructs AI agents on how to work effectively within the TravelNest codebase, including architecture, conventions, file structure, and development workflows.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Tech Stack](#tech-stack)
4. [Architecture & Design Patterns](#architecture--design-patterns)
5. [Backend (Server)](#backend-server)
6. [Frontend (Client)](#frontend-client)
7. [Admin Frontend (Admin-Client)](#admin-frontend-admin-client)
8. [Deployment & Infrastructure](#deployment--infrastructure)
9. [Coding Conventions](#coding-conventions)
10. [Development Workflow](#development-workflow)
11. [Testing Strategy](#testing-strategy)
12. [Common Tasks](#common-tasks)

---

## Project Overview

**TravelNest** is a full-stack hotel booking platform inspired by booking.com. It allows:
- **Guests**: Browse hotels, make bookings, leave reviews
- **Property Owners**: Manage listings, bookings, pricing, and analytics

### Live URLs
- Backend API: https://api.deployserver.work/api-docs
- User Client: https://deployserver.work
- Admin Client: https://admin.deployserver.work

### Key Features
- Multi-language support (Vietnamese & English)
- Real-time availability and booking
- Payment processing via Stripe
- Search powered by Elasticsearch
- Analytics via ClickHouse
- SMS notifications via Infobip
- Real-time updates via Socket.IO

---

## Monorepo Structure

```
TravelNest/
├── server/              # Node.js/Express API & background workers
├── client/              # Vue 3 user-facing web app
├── admin-client/        # Nuxt 4 admin dashboard
├── deploy/              # Infrastructure & deployment automation
├── docs/                # Documentation & project reports
├── scrape_data/         # Data scraping utilities
├── .github/             # GitHub Actions CI/CD workflows
├── README.md            # Main project README
├── LICENSE
└── .gitignore
```

### Package Managers
- **Server**: npm (CommonJS)
- **Client**: npm (ES modules)
- **Admin-Client**: npm (ES modules)

---

## Tech Stack

### Backend (`server/`)
- **Runtime**: Node.js (CommonJS)
- **Framework**: Express.js
- **ORM**: Sequelize
- **Databases**:
  - MySQL (primary database)
  - Redis (cache, sessions, queues)
  - Elasticsearch (search + logs)
  - ClickHouse (analytics)
- **Storage**: MinIO / S3-compatible object storage
- **Background Jobs**: BullMQ
- **Auth**: Passport.js (Google, Twitter OAuth)
- **Payments**: Stripe
- **SMS**: Infobip
- **Real-time**: Socket.IO
- **Logging**: Pino
- **Testing**: Jest + Testcontainers

### Frontend (`client/`)
- **Framework**: Vue 3
- **Build Tool**: Vite
- **Router**: Vue Router
- **State Management**: Vuex + vuex-persist
- **UI Library**: Element Plus
- **Maps**: Leaflet + @vue-leaflet/vue-leaflet
- **i18n**: vue-i18n
- **HTTP Client**: Axios
- **Payments**: @stripe/stripe-js
- **Real-time**: socket.io-client
- **Testing**: Vitest + Playwright

### Admin Frontend (`admin-client/`)
- **Framework**: Nuxt 4 (Vue 3)
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **UI Library**: Element Plus
- **Type Checking**: vue-tsc
- **Testing**: Vitest + Playwright

### Infrastructure (`deploy/`)
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (reverse proxy)
- **Tunnel**: Cloudflare Tunnel
- **Monitoring**: ELK Stack (Elasticsearch, Logstash, Kibana, Filebeat)
- **CI/CD**: GitHub Actions

---

## Architecture & Design Patterns

### Backend Architecture

The backend follows a **layered architecture** with strict dependency rules enforced via ESLint:

```
┌─────────────────────────────────────────┐
│         Routes (API Endpoints)          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          Controllers (HTTP)             │ ← Handles requests/responses
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          Services (Business)            │ ← Business logic
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Repositories (Data Access)         │ ← Database operations
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Models (Sequelize ORM)          │ ← Data structure
└─────────────────────────────────────────┘
```

**Dependency Rules** (enforced by ESLint):
- Controllers → Services only
- Services → Repositories + Utils only
- Repositories → Models only
- Models → Nothing (leaf layer)

### Frontend Architecture (Client)

Vue 3 app with Vuex for state management:

```
src/
├── components/       # Reusable Vue components
├── views/            # Page-level components (routed)
├── stores/           # Vuex modules (auth, booking, hotel, etc.)
├── router/           # Vue Router configuration
├── services/         # API service layer
├── request/          # Axios HTTP client configuration
├── locales/          # i18n translation files
├── assets/           # Static assets (images, styles)
├── config/           # App configuration
├── utils/            # Helper utilities
├── directives/       # Custom Vue directives
├── App.vue           # Root component
└── main.js           # Entry point
```

### Admin Frontend Architecture

Nuxt 4 app with file-based routing and Pinia:

```
admin-client/
├── pages/            # File-based routing
├── components/       # Vue components
├── stores/           # Pinia stores
├── services/         # API services
├── composables/      # Composition API reusables
├── layouts/          # Layout components
├── middleware/       # Route middleware
├── assets/           # Static assets
├── public/           # Public files
└── nuxt.config.ts    # Nuxt configuration
```

---

## Backend (Server)

### File Structure

```
server/
├── app.js                    # Express app setup
├── server.js                 # Server entry point
├── package.json
├── .env                      # Environment variables
├── .cursorrules              # API design rules (MUST follow)
├── eslint.config.mjs         # ESLint configuration
├── jest.config.js            # Jest configuration
├── jsconfig.json             # Path aliases
├── .prettierrc               # Prettier configuration
│
├── routes/                   # API routes
│   ├── health.routes.js      # Health check endpoints
│   └── v1/                   # API v1 routes
│       ├── index.js          # Route aggregator
│       ├── auth.routes.js
│       ├── hotel.routes.js
│       ├── booking.routes.js
│       ├── search.routes.js
│       ├── payment.routes.js
│       ├── review.routes.js
│       ├── user.routes.js
│       ├── notification.routes.js
│       └── webhook.routes.js
│
├── controllers/              # HTTP request handlers
│   └── v1/
│       ├── auth.controller.js
│       ├── hotel.controller.js
│       ├── booking.controller.js
│       └── ...
│
├── services/                 # Business logic layer
│   ├── auth.service.js
│   ├── hotel.service.js
│   ├── booking.service.js
│   ├── search.service.js
│   ├── payment.service.js
│   ├── email.service.js
│   └── ...
│
├── repositories/             # Data access layer
│   ├── hotel.repository.js
│   ├── booking.repository.js
│   ├── user.repository.js
│   ├── admin/                # Admin-specific repos
│   └── clickhouse/           # ClickHouse queries
│
├── models/                   # Sequelize models
│   ├── index.js              # Model loader
│   ├── user.model.js
│   ├── hotel.model.js
│   ├── booking.model.js
│   ├── room.model.js
│   ├── review.model.js
│   └── ...
│
├── validators/               # Joi validation schemas
│   └── v1/
│       ├── auth.schema.js
│       ├── hotel.schema.js
│       ├── booking.schema.js
│       └── ...
│
├── middlewares/              # Express middlewares
│   ├── error.middleware.js
│   ├── auth.middleware.js
│   ├── session.middleware.js
│   ├── rate-limitter.middleware.js
│   ├── csrf.middleware.js
│   └── request-logger.middleware.js
│
├── config/                   # Configuration files
│   ├── database.config.js
│   ├── redis.config.js
│   ├── elasticsearch.config.js
│   ├── clickhouse.config.js
│   ├── minio.config.js
│   ├── passport.config.js
│   ├── logger.config.js
│   └── swagger.config.js
│
├── queues/                   # BullMQ queue definitions
│   ├── index.js
│   ├── email.queue.js
│   ├── notification.queue.js
│   ├── image-processing.queue.js
│   ├── hotel-snapshot.queue.js
│   └── search-log.queue.js
│
├── workers/                  # BullMQ workers
│   ├── index.js
│   ├── email.worker.js
│   ├── notification.worker.js
│   └── ...
│
├── socket/                   # Socket.IO handlers
│   ├── index.js
│   └── notification.socket.js
│
├── helpers/                  # Helper functions
│   ├── hotel.helpers.js
│   └── date.helpers.js
│
├── utils/                    # Utility functions
│   ├── asyncHandler.js
│   ├── errorResponse.js
│   └── ...
│
├── adapters/                 # External service adapters
│   ├── elasticsearch.adapter.js
│   └── clickhouse.adapter.js
│
├── constants/                # Application constants
│
├── interfaces/               # Type definitions
│
├── infra/                    # Infrastructure code
│   ├── database/
│   │   ├── init.js
│   │   ├── migrations/
│   │   └── seeders/
│   ├── elasticsearch/
│   │   ├── setup-hotels-index.js
│   │   ├── setup-logs-index.js
│   │   └── seeders/
│   ├── clickhouse/
│   │   ├── migrations/
│   │   └── seeders/
│   └── minio-data/
│
├── scripts/                  # Utility scripts
│   └── clear-database.js
│
├── docs/                     # API documentation
│
├── logs/                     # Application logs
│
└── __tests__/                # Test files
    ├── unit/
    └── integration/
```

### Path Aliases (Module Aliases)

The server uses module aliases defined in `package.json` and `jsconfig.json`:

```javascript
require('@controllers/v1/hotel.controller');
require('@services/hotel.service');
require('@repositories/hotel.repository');
require('@models');
require('@config/database.config');
require('@middlewares/auth.middleware');
require('@validators/v1/hotel.schema');
require('@utils/asyncHandler');
require('@helpers/hotel.helpers');
require('@constants');
require('@interfaces');
require('@adapters/elasticsearch.adapter');
require('@queues/index');
require('@workers/index');
require('@socket/index');
```

### API Design Rules

**CRITICAL**: The file `server/.cursorrules` contains mandatory REST API design rules. When creating or modifying API endpoints, you **MUST** follow these rules:

Key rules include:
- Resources MUST be nouns, plural, and lowercase
- Use HTTP methods correctly (GET, POST, PUT, PATCH, DELETE)
- Return appropriate status codes (200, 201, 204, 400, 401, 403, 404, 409, 500)
- Wrap responses in `{ data: {...} }` format
- Use `{ error: { code, message, fields } }` for errors
- Implement pagination with `{ data: [], meta: { page, limit, total } }`
- Version API endpoints under `/api/v1/`
- No verb-based URLs (e.g., `/getUsers` is INVALID)
- Support soft delete with `deletedAt` timestamp
- Validate request bodies using Joi schemas
- Use kebab-case for resource names if needed (e.g., `/user-roles`)

### Common Backend Commands

```bash
cd server

# Development
npm run dev                    # Start server with nodemon

# Database
npm run db:init                # Initialize database
npm run migrate                # Run migrations
npm run migrate:status         # Check migration status
npm run migrate:create         # Create new migration
npm run migrate:undo           # Undo last migration

# Seeding
npm run seed:all:quick         # Quick seed for development
npm run seed:all               # Full seed
npm run seed:all:clear         # Clear and reseed
npm run seed:user              # Seed specific table
npm run db:clear               # Clear entire database

# Elasticsearch
npm run es:setup-hotels        # Setup hotels search index
npm run es:seed-hotels         # Seed hotels to Elasticsearch
npm run es:setup-logs          # Setup logs index
npm run es:setup-destinations  # Setup destinations index

# ClickHouse
npm run clickhouse:migrate     # Run ClickHouse migrations
npm run clickhouse:seed:search_logs    # Seed search logs
npm run clickhouse:seed:hotel_views    # Seed hotel views

# Workers
npm run dev:bullmq-worker      # Start BullMQ workers

# Testing
npm test                       # Run all tests
npm run test:unit              # Run unit tests
npm run test:integration       # Run integration tests
npm run test:coverage          # Generate coverage report
npm run test:watch             # Watch mode

# Code Quality
npm run lint                   # Lint code
npm run lint:fix               # Auto-fix lint issues
npm run format                 # Format with Prettier

# Production
npm start                      # Start production server
```

### Creating New Features (Backend)

When adding a new feature (e.g., "wishlist"):

1. **Model**: Create `models/wishlist.model.js` (PascalCase class name)
2. **Repository**: Create `repositories/wishlist.repository.js` (data access)
3. **Service**: Create `services/wishlist.service.js` (business logic)
4. **Controller**: Create `controllers/v1/wishlist.controller.js` (HTTP handlers)
5. **Validator**: Create `validators/v1/wishlist.schema.js` (Joi schemas)
6. **Routes**: Create `routes/v1/wishlist.routes.js` and register in `routes/v1/index.js`
7. **Tests**: Create `__tests__/unit/wishlist.service.test.js` and/or integration tests
8. **Migration**: Create migration via `npm run migrate:create -- --name add-wishlist-table`

---

## Frontend (Client)

### File Structure

```
client/
├── src/
│   ├── main.js               # App entry point
│   ├── App.vue               # Root component
│   │
│   ├── components/           # Reusable components
│   │   ├── common/           # Common UI components
│   │   ├── layout/           # Layout components (Header, Footer, etc.)
│   │   ├── booking/          # Booking-related components
│   │   ├── hotel/            # Hotel display components
│   │   └── ...
│   │
│   ├── views/                # Page components (routed)
│   │   ├── Home.vue
│   │   ├── HotelDetails.vue
│   │   ├── SearchResults.vue
│   │   ├── Booking.vue
│   │   ├── UserProfile.vue
│   │   └── ...
│   │
│   ├── router/               # Vue Router
│   │   ├── index.js          # Main router config
│   │   └── guards.js         # Navigation guards
│   │
│   ├── stores/               # Vuex store modules
│   │   ├── index.js          # Store setup
│   │   ├── auth.js           # Auth state
│   │   ├── booking.js        # Booking state
│   │   ├── hotel.js          # Hotel state
│   │   └── ...
│   │
│   ├── services/             # API service layer
│   │   ├── auth.service.js
│   │   ├── hotel.service.js
│   │   ├── booking.service.js
│   │   └── ...
│   │
│   ├── request/              # Axios configuration
│   │   └── index.js          # HTTP client setup
│   │
│   ├── assets/               # Static assets
│   │   ├── styles/           # SCSS files
│   │   │   ├── base/
│   │   │   ├── components/
│   │   │   ├── layouts/
│   │   │   └── main.scss
│   │   └── images/
│   │
│   ├── locales/              # i18n translations
│   │   ├── en.json
│   │   └── vi.json
│   │
│   ├── config/               # App configuration
│   │
│   ├── utils/                # Utility functions
│   │
│   └── directives/           # Custom Vue directives
│
├── public/                   # Public static files
├── tests/                    # Tests
│   ├── unit/
│   ├── components/
│   └── e2e/
├── vite.config.js            # Vite configuration
├── package.json
├── .env.development          # Development env vars
├── .env.production           # Production env vars
└── .eslintrc.cjs             # ESLint config
```

### Path Alias

The client uses `@` alias for `src/`:

```javascript
import HotelCard from '@/components/hotel/HotelCard.vue';
import { useAuthStore } from '@/stores/auth';
import hotelService from '@/services/hotel.service';
```

### Common Frontend Commands

```bash
cd client

# Development
npm run dev                    # Start dev server (http://localhost:5173)

# Build
npm run build                  # Build for production
npm run preview                # Preview production build

# Code Quality
npm run lint                   # Lint code
npm run lint:fix               # Auto-fix lint issues
npm run format                 # Format with Prettier

# Testing
npm run test                   # Run tests
npm run test:unit              # Run unit tests
npm run test:component         # Run component tests
npm run test:ui                # Open Vitest UI
npm run test:e2e               # Run Playwright e2e tests
```

### Environment Variables

All environment variables MUST start with `VITE_`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

Access in code:

```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

---

## Admin Frontend (Admin-Client)

### File Structure

```
admin-client/
├── pages/                    # File-based routing
│   ├── index.vue             # Dashboard home
│   ├── hotels/
│   │   ├── index.vue         # Hotel list
│   │   ├── [id].vue          # Hotel detail
│   │   └── create.vue        # Create hotel
│   ├── bookings/
│   ├── users/
│   └── analytics/
│
├── components/               # Vue components
│   ├── common/
│   ├── hotel/
│   ├── booking/
│   └── ...
│
├── stores/                   # Pinia stores
│   ├── auth.js
│   ├── hotel.js
│   └── ...
│
├── services/                 # API services
│   ├── auth.service.js
│   ├── hotel.service.js
│   └── ...
│
├── composables/              # Composition API utilities
│   ├── useAuth.js
│   ├── useFetch.js
│   └── ...
│
├── layouts/                  # Layout components
│   ├── default.vue
│   └── auth.vue
│
├── middleware/               # Route middleware
│   └── auth.js
│
├── assets/                   # Static assets
│   ├── styles/
│   └── images/
│
├── public/                   # Public files
│
├── nuxt.config.ts            # Nuxt configuration
├── tailwind.config.js        # Tailwind configuration
└── package.json
```

### Common Admin Frontend Commands

```bash
cd admin-client

# Development
npm run dev                    # Start Nuxt dev server

# Build
npm run build                  # Build for production
npm run generate               # Generate static site
npm run preview                # Preview production build

# Code Quality
npm run lint                   # ESLint
npm run lint:fix               # Auto-fix
npm run typecheck              # TypeScript type checking
npm run format                 # Format with Prettier
npm run format:check           # Check formatting

# Testing
npm run test                   # Run all tests
npm run test:unit              # Unit tests
npm run test:nuxt              # Nuxt integration tests
npm run test:e2e               # Playwright e2e tests
npm run test:e2e:ui            # Playwright UI mode
```

### Environment Variables

Nuxt environment variables:

```bash
# Server-side only
NUXT_API_BASE_URL=http://localhost:3000/api/v1

# Client-side accessible (NUXT_PUBLIC_ prefix)
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NUXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

Access in code:

```javascript
const config = useRuntimeConfig();
const apiUrl = config.public.apiBaseUrl;
```

---

## Deployment & Infrastructure

The deployment stack lives in `deploy/` directory. See `deploy/README.md` for full details.

### Architecture Overview

```
Cloudflare DNS → Cloudflare Tunnel → Nginx → API/Clients
                                            ↓
                        MySQL + Redis + Elasticsearch + ClickHouse + MinIO
                                            ↓
                        ELK Stack (Filebeat, Logstash, Kibana)
```

### VPS Directory Structure

```
/opt/travelnest/
├── docker-compose.yml
├── .env
├── nginx/
├── data/
├── logs/
└── backups/
```

### Deployment Commands

```bash
# On VPS
cd /opt/travelnest
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose logs -f api        # View API logs
docker compose restart api        # Restart API container
```

### CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `ci-backend.yml` - Lint & test backend
- `ci-frontend.yml` - Lint & test frontend
- `docker-build-push.yml` - Build and push Docker images
- `deploy.yml` - Deploy to VPS

---

## Coding Conventions

### General Rules

1. **Naming Conventions**:
   - **kebab-case**: folders, filenames (`hotel.service.js`, `hotel-card.vue`)
   - **camelCase**: variables, functions (`getUserById`, `hotelDetails`)
   - **PascalCase**: classes, Sequelize models, Vue components (`HotelCard`, `User`)
   - **UPPER_SNAKE_CASE**: constants (`MAX_UPLOAD_SIZE`, `API_VERSION`)

2. **File Naming**:
   - Backend: `<entity>.<layer>.js` (e.g., `hotel.service.js`, `user.repository.js`)
   - Frontend: `<ComponentName>.vue` or `<feature>.js`

3. **Code Style**:
   - Use Prettier for formatting (configured in `.prettierrc`)
   - Use ESLint for linting (configured in `eslint.config.mjs` or `.eslintrc.cjs`)
   - **Semi-colons**: Required (`;`)
   - **Quotes**: Single quotes (`'`)
   - **Trailing commas**: ES5 style
   - **Print width**: 100 characters
   - **Tab width**: 2 spaces

### Backend Conventions

1. **Controllers**:
   - Use `asyncHandler` wrapper for async functions
   - Keep controllers thin (delegate to services)
   - Return consistent JSON responses

```javascript
const asyncHandler = require('@utils/asyncHandler');

const getHotelDetails = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const result = await hotelService.getHotelDetails(hotelId);
  res.status(200).json({ data: result });
});
```

2. **Services**:
   - Contain business logic
   - Call repositories for data access
   - Throw errors using custom error classes

```javascript
const hotelRepository = require('@repositories/hotel.repository');

const getHotelDetails = async (hotelId) => {
  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) {
    throw new NotFoundError('Hotel not found');
  }
  return hotel;
};
```

3. **Repositories**:
   - Use Sequelize models
   - Keep queries optimized
   - Return raw data (no business logic)

```javascript
const { Hotel } = require('@models');

const findById = async (hotelId) => {
  return await Hotel.findByPk(hotelId, {
    include: ['rooms', 'amenities'],
  });
};
```

4. **Models**:
   - Use Sequelize define or extend Model class
   - Define associations in model files
   - Use timestamps (`createdAt`, `updatedAt`)

```javascript
module.exports = (sequelize, DataTypes) => {
  const Hotel = sequelize.define('Hotel', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    // ... other fields
  });
  
  Hotel.associate = (models) => {
    Hotel.hasMany(models.Room, { foreignKey: 'hotelId' });
  };
  
  return Hotel;
};
```

5. **Validators**:
   - Use Joi for request validation
   - Create reusable schemas

```javascript
const Joi = require('joi');

const getHotelDetails = {
  params: Joi.object({
    hotelId: Joi.string().uuid().required(),
  }),
  query: Joi.object({
    checkInDate: Joi.date().optional(),
    checkOutDate: Joi.date().optional(),
  }),
};
```

6. **Error Handling**:
   - Use custom error classes
   - Let error middleware handle responses
   - Always provide meaningful error messages

### Frontend Conventions (Client)

1. **Components**:
   - Single File Components (`.vue`)
   - Use Composition API (`<script setup>`) for new components
   - Options API is acceptable for existing components

```vue
<template>
  <div class="hotel-card">
    <h3>{{ hotel.name }}</h3>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  hotel: Object,
});
</script>

<style scoped lang="scss">
.hotel-card {
  padding: 1rem;
}
</style>
```

2. **Vuex Store**:
   - Use modules for organization
   - Keep actions async, mutations sync
   - Use getters for computed state

```javascript
export default {
  namespaced: true,
  state: () => ({ hotels: [] }),
  mutations: {
    SET_HOTELS(state, hotels) {
      state.hotels = hotels;
    },
  },
  actions: {
    async fetchHotels({ commit }) {
      const data = await hotelService.getHotels();
      commit('SET_HOTELS', data);
    },
  },
  getters: {
    activeHotels: (state) => state.hotels.filter(h => h.status === 'active'),
  },
};
```

3. **Services**:
   - Create service files for API calls
   - Return data from axios responses

```javascript
import axios from '@/request';

export default {
  getHotels(params) {
    return axios.get('/hotels', { params }).then(res => res.data.data);
  },
  
  getHotelDetails(hotelId) {
    return axios.get(`/hotels/${hotelId}`).then(res => res.data.data);
  },
};
```

### Admin Frontend Conventions

1. **File-based Routing**:
   - File name = route path
   - `pages/hotels/[id].vue` → `/hotels/:id`

2. **Pinia Stores**:
   - Use Composition API style

```javascript
import { defineStore } from 'pinia';

export const useHotelStore = defineStore('hotel', {
  state: () => ({ hotels: [] }),
  actions: {
    async fetchHotels() {
      const data = await hotelService.getHotels();
      this.hotels = data;
    },
  },
});
```

3. **Composables**:
   - Extract reusable logic

```javascript
export const useAuth = () => {
  const authStore = useAuthStore();
  const router = useRouter();
  
  const logout = async () => {
    await authStore.logout();
    router.push('/login');
  };
  
  return { logout };
};
```

---

## Development Workflow

### Setting Up Local Environment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bk-leducphuong/TravelNest.git
   cd TravelNest
   ```

2. **Start Backend**:
   ```bash
   cd server
   npm install
   cp .env.format .env  # Configure your .env
   npm run db:init
   npm run migrate
   npm run seed:all:quick
   npm run dev
   ```

3. **Start Client**:
   ```bash
   cd client
   npm install
   cp .env.format .env  # Configure your .env
   npm run dev
   ```

4. **Start Admin Client**:
   ```bash
   cd admin-client
   npm install
   cp .env.format .env  # Configure your .env
   npm run dev
   ```

### Branch Strategy

- `main` - Production branch
- `dev` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Commit Message Convention

Follow conventional commits:

```
feat: add hotel wishlist feature
fix: resolve booking date validation issue
docs: update API documentation
refactor: simplify search service logic
test: add unit tests for hotel service
chore: update dependencies
```

### Making Changes

1. Create a new branch from `dev`
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Format code: `npm run format`
6. Commit changes with meaningful message
7. Push and create pull request to `dev`

---

## Testing Strategy

### Backend Testing

- **Unit Tests**: Test individual functions/services in isolation
- **Integration Tests**: Test API endpoints with real database (Testcontainers)

```javascript
describe('Hotel Service', () => {
  it('should get hotel details', async () => {
    const hotel = await hotelService.getHotelDetails('hotel-id');
    expect(hotel).toBeDefined();
    expect(hotel.name).toBe('Test Hotel');
  });
});
```

### Frontend Testing

- **Unit Tests**: Test utilities and composables
- **Component Tests**: Test Vue components
- **E2E Tests**: Test user flows with Playwright

```javascript
describe('HotelCard.vue', () => {
  it('renders hotel name', () => {
    const wrapper = mount(HotelCard, {
      props: { hotel: { name: 'Test Hotel' } },
    });
    expect(wrapper.text()).toContain('Test Hotel');
  });
});
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Define Validator** (`validators/v1/hotel.schema.js`):
   ```javascript
   const getHotelReviews = {
     params: Joi.object({
       hotelId: Joi.string().uuid().required(),
     }),
     query: Joi.object({
       page: Joi.number().min(1).default(1),
       limit: Joi.number().min(1).max(100).default(20),
     }),
   };
   ```

2. **Create Controller** (`controllers/v1/hotel.controller.js`):
   ```javascript
   const getHotelReviews = asyncHandler(async (req, res) => {
     const { hotelId } = req.params;
     const { page, limit } = req.query;
     const result = await hotelService.getHotelReviews(hotelId, { page, limit });
     res.status(200).json({ data: result });
   });
   ```

3. **Add Service Logic** (`services/hotel.service.js`):
   ```javascript
   const getHotelReviews = async (hotelId, { page, limit }) => {
     const reviews = await reviewRepository.findByHotelId(hotelId, { page, limit });
     return reviews;
   };
   ```

4. **Create Route** (`routes/v1/hotel.routes.js`):
   ```javascript
   router.get('/:hotelId/reviews', validate(hotelSchema.getHotelReviews), getHotelReviews);
   ```

5. **Test**:
   ```javascript
   describe('GET /api/v1/hotels/:hotelId/reviews', () => {
     it('should return hotel reviews', async () => {
       const res = await request(app).get('/api/v1/hotels/hotel-id/reviews');
       expect(res.status).toBe(200);
       expect(res.body.data).toBeDefined();
     });
   });
   ```

### Adding a New Database Table

1. **Create Migration**:
   ```bash
   cd server
   npm run migrate:create -- --name create-wishlist-table
   ```

2. **Edit Migration File** (`infra/database/migrations/XXXXXX-create-wishlist-table.js`):
   ```javascript
   module.exports = {
     up: async (queryInterface, Sequelize) => {
       await queryInterface.createTable('Wishlists', {
         id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
         userId: { type: Sequelize.UUID, allowNull: false },
         hotelId: { type: Sequelize.UUID, allowNull: false },
         createdAt: { type: Sequelize.DATE, allowNull: false },
         updatedAt: { type: Sequelize.DATE, allowNull: false },
       });
     },
     down: async (queryInterface) => {
       await queryInterface.dropTable('Wishlists');
     },
   };
   ```

3. **Run Migration**:
   ```bash
   npm run migrate
   ```

4. **Create Model** (`models/wishlist.model.js`):
   ```javascript
   module.exports = (sequelize, DataTypes) => {
     const Wishlist = sequelize.define('Wishlist', {
       id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
       userId: { type: DataTypes.UUID, allowNull: false },
       hotelId: { type: DataTypes.UUID, allowNull: false },
     });
     
     Wishlist.associate = (models) => {
       Wishlist.belongsTo(models.User, { foreignKey: 'userId' });
       Wishlist.belongsTo(models.Hotel, { foreignKey: 'hotelId' });
     };
     
     return Wishlist;
   };
   ```

5. **Create Seeder** (optional):
   ```bash
   cd infra/database/seeders
   # Create wishlist.seed.js
   ```

### Adding a New Vue Component

1. **Create Component** (`client/src/components/hotel/HotelWishlistButton.vue`):
   ```vue
   <template>
     <button @click="toggleWishlist">
       <i :class="isInWishlist ? 'el-icon-star-on' : 'el-icon-star-off'"></i>
     </button>
   </template>

   <script setup>
   import { ref } from 'vue';
   import { useStore } from 'vuex';

   const props = defineProps({
     hotelId: String,
   });

   const store = useStore();
   const isInWishlist = ref(false);

   const toggleWishlist = () => {
     store.dispatch('wishlist/toggle', props.hotelId);
     isInWishlist.value = !isInWishlist.value;
   };
   </script>

   <style scoped>
   button { cursor: pointer; }
   </style>
   ```

2. **Use Component**:
   ```vue
   <template>
     <HotelWishlistButton :hotel-id="hotel.id" />
   </template>

   <script setup>
   import HotelWishlistButton from '@/components/hotel/HotelWishlistButton.vue';
   </script>
   ```

### Running Database Migrations & Seeds

```bash
cd server

# Migrations
npm run migrate                 # Run pending migrations
npm run migrate:status          # Check migration status
npm run migrate:undo            # Undo last migration
npm run migrate:undo:all        # Undo all migrations

# Seeding
npm run seed:all:quick          # Quick seed (small dataset)
npm run seed:all                # Full seed
npm run seed:all:clear          # Clear and reseed
npm run seed:hotel              # Seed specific entity
```

### Debugging Tips

1. **Backend Debugging**:
   - Check logs in `server/logs/`
   - Use `logger.info()`, `logger.error()` for structured logging
   - Check Bull Board dashboard at `/admin/queues`
   - Check API docs at `/api-docs`

2. **Frontend Debugging**:
   - Use Vue DevTools browser extension
   - Check Vuex state in Vue DevTools
   - Check Network tab for API calls
   - Use `console.log()` sparingly (prefer Vue DevTools)

3. **Database Debugging**:
   - Check MySQL logs
   - Use Sequelize query logging (set `logging: console.log` in config)

---

## Key Files & Configuration

### Environment Variables

**Server** (`.env`):
- `NODE_ENV` - Environment (development, production)
- `PORT` - Server port
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - MySQL config
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis config
- `ES_HOST`, `ES_PORT` - Elasticsearch config
- `CH_HOST`, `CH_PORT` - ClickHouse config
- `MINIO_*` - MinIO/S3 config
- `STRIPE_SECRET_KEY` - Stripe API key
- `SESSION_SECRET` - Session secret
- `CLIENT_HOST`, `ADMIN_CLIENT_HOST` - CORS origins

**Client** (`.env`):
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_SOCKET_URL` - Socket.IO URL
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key

**Admin Client** (`.env`):
- `NUXT_PUBLIC_API_BASE_URL` - Backend API URL

### Configuration Files

- `server/config/database.config.js` - Database connection
- `server/config/redis.config.js` - Redis connection
- `server/config/elasticsearch.config.js` - Elasticsearch client
- `server/config/clickhouse.config.js` - ClickHouse client
- `server/config/minio.config.js` - MinIO/S3 client
- `server/config/passport.config.js` - OAuth strategies
- `server/config/logger.config.js` - Pino logger
- `server/config/swagger.config.js` - API documentation

---

## Additional Resources

- **Main README**: `README.md`
- **Server README**: `server/README.md`
- **Client README**: `client/README.md`
- **Admin Client README**: `admin-client/README.md`
- **Deployment README**: `deploy/README.md`
- **API Design Rules**: `server/.cursorrules`
- **API Documentation**: https://api.deployserver.work/api-docs
- **Video Demo**: [YouTube Playlist](https://www.youtube.com/watch?v=-jxhmIJp988&list=PLCt2C1YyUqcCfEhqOXE-Mul8UINudlCse)

---

## Summary Checklist for AI Agents

When working in this repository:

- [ ] Read and understand the layered architecture (Routes → Controllers → Services → Repositories → Models)
- [ ] Follow the API design rules in `server/.cursorrules` strictly
- [ ] Use module aliases (`@controllers`, `@services`, etc.) in backend code
- [ ] Use path alias (`@/`) in frontend code
- [ ] Follow naming conventions (kebab-case files, camelCase functions, PascalCase classes)
- [ ] Write tests for new features
- [ ] Run linter and formatter before committing
- [ ] Use environment variables (never hardcode credentials)
- [ ] Respect ESLint architecture boundaries (Controller → Service → Repository → Model)
- [ ] Add JSDoc comments for complex functions
- [ ] Update relevant README files when adding major features
- [ ] Check existing patterns before creating new approaches
- [ ] Use asyncHandler for async Express route handlers
- [ ] Wrap responses in `{ data: ... }` format
- [ ] Handle errors properly with custom error classes
- [ ] Test API endpoints manually using Swagger or Postman
- [ ] Consider performance implications (database queries, caching, etc.)

---

**Last Updated**: 2026-04-01
**Version**: 1.0
