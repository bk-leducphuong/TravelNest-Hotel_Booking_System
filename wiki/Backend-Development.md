# Backend Development

## Overview

The backend (`server/`) is a Node.js/Express API with background workers. It follows a layered architecture:

## Project Structure

```
server/
├── adapters/           External integrations (Stripe, webhooks)
├── config/             Configuration files
├── constants/          Application constants
├── controllers/v1/     HTTP handlers (thin)
├── events/             NATS event pub/sub
├── helpers/            Utility helpers
├── infra/              Dockerfiles, migrations, ES/Mongo setup
├── middlewares/        Auth, error, rate-limiter, validation
├── models/             Sequelize models (MySQL) + Mongoose (Mongo)
├── queues/             BullMQ queue definitions
├── repositories/       Database access layer
├── routes/v1/          API route definitions
├── scripts/            Utility scripts
├── seeders/            Data seeders
├── services/           Business logic layer
├── socket/             Socket.IO setup + controllers
├── validators/v1/      Joi validation schemas
├── workers/            BullMQ worker processors
├── __tests__/          Unit + integration tests
├── app.js              Express app setup
└── server.js           Entry point
```

## Adding a New API Endpoint

The standard flow for adding a new endpoint is:

1. **Joi Schema** — Add/update validation in `validators/v1/`
2. **Route** — Add route in `routes/v1/` with validation middleware
3. **Controller** — Add thin handler in `controllers/v1/`
4. **Service** — Put business logic in `services/`
5. **Repository** — Put Sequelize queries in `repositories/`
6. **Test** — Add Jest tests in `__tests__/`

```javascript
// Example: routes/v1/hotel.routes.js
const { authenticate } = require('@middlewares/auth');
const validate = require('@middlewares/validation');
const hotelController = require('@controllers/v1/hotel.controller');
const { createHotelSchema } = require('@validators/v1/hotel.validator');

router.post(
  '/hotels',
  authenticate,
  validate(createHotelSchema),
  hotelController.create
);
```

## Background Workers (BullMQ)

Workers handle async jobs. The queue/worker pattern:

- **Queues** defined in `queues/` (bookingExpiry, holdExpiry, hotelSnapshot)
- **Workers** in `workers/` process queue jobs
- Started via `npm run dev:bullmq-worker`

## Events (NATS)

The `events/` directory contains NATS JetStream publishers and subscribers for communication with Go microservices:

- `events/publishers/` — emit events (e.g., booking.created, review.submitted)
- `events/subscribers/` — handle events from Go services

## Real-time (Socket.IO)

Socket.IO is set up for live notifications and updates:

- `socket/index.js` — Socket.IO server initialization
- `socket/auth.js` — Socket authentication
- `socket/controllers/` — Event handlers

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

## Key Conventions

- **CommonJS** modules (`require`/`module.exports`)
- **Module aliases**: `@services`, `@repositories`, `@models`, `@config`, etc.
- **Controllers should be thin** — delegate to services
- **Repositories own all Sequelize model access**
- **Use `ApiError` + `asyncHandler`** patterns for error handling
- **Stripe webhooks** must have raw body parsing (before `bodyParser.json()`)
- **Session/cookie-based auth** with CORS credentials
