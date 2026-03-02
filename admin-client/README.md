# TravelNest Admin Client (Nuxt 4)

The TravelNest admin client is a Nuxt 4 application used by property owners and administrators
to manage listings, bookings, users, reviews, analytics, and platform configuration.

## Tech Stack

- **Framework**: Nuxt 4 (Vue 3)
- **State Management**: Pinia
- **Routing**: Vue Router (via Nuxt pages)
- **Styling & UI**:
  - Tailwind CSS
  - Element Plus (via `@element-plus/nuxt`)
- **Language & Tooling**:
  - TypeScript support via `vue-tsc`
  - ESLint + Prettier
  - Vitest + @vue/test-utils for unit tests
  - Playwright for end-to-end tests

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A running instance of the TravelNest API (see `server/README.md`)

### Install Dependencies

```bash
cd admin-client
npm install
```

Nuxt will run a `postinstall` hook (`nuxt prepare`) as part of the install step.

### Environment Variables

Create a `.env` file in the `admin-client` directory.
Common variables (names may vary depending on your configuration):

- `NUXT_API_BASE_URL` – base URL of the TravelNest API
- `NUXT_PUBLIC_API_BASE_URL` – public API base URL exposed to the client
- Any additional `NUXT_PUBLIC_*` variables for analytics, feature flags, etc.

> All environment variables exposed to the browser must use the `NUXT_PUBLIC_` prefix.

## Run the App

### Development

```bash
cd admin-client
npm run dev
```

By default Nuxt will start on `http://localhost:3000` (or the next available port).

### Production Build

```bash
cd admin-client
npm run build
```

You can then either:

- Run Nuxt in server mode, or
- Generate a static site and serve via Nginx (see below and `deploy/README.md`).

### Static Generation

```bash
npm run generate
```

This produces a statically generated version of the admin app, which is typically what is deployed
in the production stack under `admin.deployserver.work`.

### Preview Production Build

```bash
npm run preview
```

## Linting, Type Checking & Formatting

```bash
# ESLint
npm run lint
npm run lint:fix

# Type checking
npm run typecheck

# Prettier
npm run format
npm run format:check
```

## Testing

The admin client has unit, Nuxt-specific, and end-to-end tests.

```bash
# All tests (shortcut)
npm run test

# Unit tests
npm run test:unit

# Nuxt integration tests
npm run test:nuxt

# End-to-end tests (Playwright)
npm run test:e2e

# End-to-end tests with UI
npm run test:e2e:ui
```

Refer to the test configuration (Vitest, Playwright) for more details on how tests are organized.

## Roadmap

- [ ] Add more end-to-end coverage for complex admin workflows (pricing, availability, policies).
- [ ] Harden access control and role-based UI visibility.
- [ ] Improve performance on large datasets (infinite scroll, table virtualization).
- [ ] Add auditing views for sensitive actions (refunds, payouts, manual overrides).
- [ ] Enhance admin dashboards with more analytics powered by ClickHouse.

