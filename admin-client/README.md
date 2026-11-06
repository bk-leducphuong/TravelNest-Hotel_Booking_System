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

Copy `admin-client/.env.example` to `admin-client/.env` and set the public
API, media and Keycloak URLs for your environment:

- `NUXT_PUBLIC_API_BASE` — API base, including `/api/v1`.
- `NUXT_PUBLIC_MEDIA_BASE` — public bucket URL, such as `http://localhost:9000/uploads/`.
  Media APIs return object keys (`room/<id>/<file>.avif`); the UI resolves these
  against this base. Absolute/CDN URLs are preserved. Failed images show a placeholder.
- `NUXT_PUBLIC_KEYCLOAK_URL`, `NUXT_PUBLIC_KEYCLOAK_REALM`,
  `NUXT_PUBLIC_KEYCLOAK_CLIENT_ID`, `NUXT_PUBLIC_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI` — OIDC configuration.

These values are public. Docker/CI forwards the same variables as build arguments;
production media defaults to the same public bucket as the guest app. Rebuild the
image when changing build-time values. Never use storage access keys here.

## Run the App

### Development

```bash
cd admin-client
npm run dev
```

The admin dev server starts on `http://localhost:8000`.

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

## Project Structure

```
admin-client/
├── pages/           File-based routes (index.vue, login.vue)
├── layouts/         Nuxt layouts
├── middleware/      Route middleware (auth checks)
├── stores/          Pinia stores (auth.ts)
├── composables/     Reusable composition functions (useApiFetch)
├── tests/           Unit (Vitest), Nuxt integration, E2E (Playwright)
├── nuxt.config.ts   Nuxt configuration
├── vitest.config.ts Vitest configuration
└── playwright.config.ts
```

## Roadmap

- [ ] Add more end-to-end coverage for complex admin workflows (pricing, availability, policies).
- [ ] Harden access control and role-based UI visibility.
- [ ] Improve performance on large datasets (infinite scroll, table virtualization).
- [ ] Add auditing views for sensitive actions (refunds, payouts, manual overrides).
- [ ] Enhance admin dashboards with more analytics powered by MongoDB.

---

📖 See the **[Wiki: Frontend Development](https://github.com/bk-leducphuong/TravelNest/wiki/Frontend-Development)** for more details.
