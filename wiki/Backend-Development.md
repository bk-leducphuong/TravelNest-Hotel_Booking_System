# Backend Development

## Overview

The backend (`server/`) is a Node.js/Express API with background workers, organised as a
**modular monolith**: one deployable, split into bounded-context modules with enforced
boundaries. See [Modular Monolith](Modular-Monolith) for the pattern.

## Project Structure

```
server/
├── app.js              Express app setup
├── server.js           Entry point
├── bff/admin/          Thin admin edge -> /api/v1/admin/*
├── modules/            Bounded contexts (12)
│   └── <module>/
│       ├── domain/           Pure rules/state machines
│       ├── application/      Use-cases (application/admin/* for back-office)
│       ├── infrastructure/   Models + repositories + adapters
│       ├── api/              Routers/controllers/schemas
│       ├── events/           Domain publishers/subscribers
│       ├── jobs/             BullMQ queues + worker factories (only where needed)
│       └── index.js          PUBLIC interface - the only cross-module surface
├── platform/           Cross-cutting: events, audit, realtime, health, internal, validation
├── events/             NATS transport adapter (platform/events is the in-process port)
├── workers/            Worker-process entrypoint (composition root)
├── routes/v1/index.js  Guest v1 route composition root
├── models/index.js     Central Sequelize registry (scans module/platform model dirs)
├── config/             Configuration files
├── constants/          Application constants
├── middlewares/        Auth, error, rate-limiter, validation
├── helpers/            Shared helpers
├── utils/              Shared utilities
├── infra/              Dockerfiles, migrations, ES/Mongo setup
├── scripts/            Utility scripts
├── seeders/            Data seeders
└── __tests__/          Unit + integration tests
```

## Adding a New API Endpoint

Business logic lives in the module that owns the domain; the edge just wires it up:

1. **Schema** — Add Joi validation in `modules/<module>/api/*.schema.js`.
2. **Route** — Add the route in `modules/<module>/api/*.routes.js` with the `validate` middleware.
3. **Controller** — Add a thin handler in `modules/<module>/api/*.controller.js`.
4. **Use-case** — Put business logic in `modules/<module>/application/`.
5. **Persistence** — Put Sequelize queries in `modules/<module>/infrastructure/`.
6. **Expose** — Export what other modules/edges need from `modules/<module>/index.js`.
7. **Mount** — Mount guest routes in `routes/v1/index.js`; admin routes in `bff/admin/index.js`.
8. **Test** — Add Jest tests in `__tests__/unit/modules/<module>/`.

```javascript
// Example: modules/catalog/api/guest.routes.js
const express = require('express');
const { optionalAuthenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const hotelSchema = require('./guest.schema');
const { getHotelDetails } = require('./hotel.controller');

const router = express.Router();
const HOTEL_ID_ROUTE_PARAM = ':hotelId([0-9a-fA-F-]{36})';

router.get(
  `/${HOTEL_ID_ROUTE_PARAM}`,
  optionalAuthenticate,
  validate(hotelSchema.getHotelDetails),
  getHotelDetails
);
```

## Background Workers (BullMQ)

Each module owns its own queues and worker definitions; the worker process composes them:

- **Jobs** live under `modules/<module>/jobs/` and are exposed via the module's public
  `jobs` API, e.g. `@modules/booking` → `jobs.holdExpiry.{queue,schedule,createWorker}`.
- **Workers** are factories (`createWorker()`), not module-level singletons — a BullMQ
  `Worker` opens a Redis connection on construction, so only the worker process builds them.
- `workers/index.js` is the worker-process **composition root** (builds workers, registers
  transports, schedules repeat jobs, serves health). Started via `npm run start:bullmq-worker`
  (prod) or `npm run dev:bullmq-worker` (dev).

## Events (NATS)

`platform/events/` is the in-process **EventPublisher port** (bus + producers + consumers).
`events/nats.adapter.js` is the NATS JetStream transport adapter that bridges to the Go
microservices; it is registered as a transport by the worker process. Modules publish and
subscribe under `modules/<module>/events/` via `@platform/events`.

## Real-time (Socket.IO)

Socket.IO is cross-cutting realtime transport under `platform/realtime/`:

- `platform/realtime/server.js` — server initialization and namespace wiring
- `platform/realtime/auth.js` — socket authentication
- `platform/realtime/namespaces/` — per-audience event handlers (`/public`, `/user`, `/property`, `/support`, `/admin`)
- `platform/realtime/index.js` — public API (`initSocket`, `getIO`, `getNamespace`, `emitToUser`, …)

## Testing

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires Docker for Testcontainers)
npm run test:integration

# Coverage report
npm run test:coverage
```

## Architecture Checks

```bash
npm run arch:check    # blocking: cross-module internals, layer leaks, god files
npm run schema:check  # blocking: model changes have migrations
```

## Key Conventions

- **CommonJS** modules (`require`/`module.exports`)
- **Module aliases**: `@modules`, `@platform`, `@config`, `@models`, `@middlewares`, `@utils`, etc.
- **Module internals are private** — cross-module access only via `@modules/<name>` (public
  `index.js`) or domain events, never `@modules/<name>/<subpath>`
- **Controllers should be thin** — delegate to module use-cases
- **Repositories own all Sequelize model access**
- **Model files use relative requires** (the registry is loaded by scripts without aliases)
- **Use `ApiError` + `asyncHandler`** patterns for error handling
- **Stripe webhooks** must have raw body parsing (before `bodyParser.json()`)
- **Session/cookie-based auth** with CORS credentials
