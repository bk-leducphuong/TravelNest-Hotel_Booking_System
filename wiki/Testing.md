# Testing

---

## Server Tests (`server/`)

**Framework**: Jest with Testcontainers for integration tests

```bash
cd server

# All tests
npm test

# Unit tests only (fast, no external deps)
npm run test:unit

# Integration tests (requires Docker for MySQL/Redis Testcontainers)
npm run test:integration

# Coverage report
npm run test:coverage

# CI mode (used in GitHub Actions)
npm run test:ci
```

### Test Structure

```
server/__tests__/
├── unit/              Controller, middleware, service, repository tests
├── integration/       API endpoint tests, socket tests, Testcontainers
├── fixtures/          Test data fixtures
├── mocks/             Mock setups
├── globalSetup.js     Testcontainers lifecycle (start)
├── globalTeardown.js  Testcontainers lifecycle (stop)
└── setup.js           Test hooks and utilities
```

---

## User Client Tests (`client/`)

**Framework**: Vitest (unit/component) + Playwright (E2E)

```bash
cd client

# All tests (Vitest)
npm run test

# Unit tests
npm run test:unit

# Component tests
npm run test:component

# E2E tests (Playwright)
npm run test:e2e
```

---

## Admin Client Tests (`admin-client/`)

**Framework**: Vitest + @vue/test-utils (unit), @nuxt/test-utils (integration), Playwright (E2E)

```bash
cd admin-client

# All tests (shortcut)
npm run test

# Unit tests
npm run test:unit

# Nuxt integration tests
npm run test:nuxt

# E2E tests (Playwright)
npm run test:e2e

# E2E with UI mode
npm run test:e2e:ui
```

---

## Running Tests from Root

```bash
# Test all packages
yarn test

# Test specific workspace
yarn workspace @travelnest/server test:unit
yarn workspace @travelnest/client test:component
yarn workspace @travelnest/admin-client test:nuxt
```

---

## Coverage Goals

The project aims for 80%+ coverage on:
- Statements
- Functions
- Lines
- Branches

Coverage thresholds are enforced in CI via `jest.config.js` for the server package.
