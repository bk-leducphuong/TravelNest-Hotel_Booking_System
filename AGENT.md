# TravelNest Agent Guide

This file is for AI coding agents working in the TravelNest monorepo. Use it as the first stop before changing code.

## Project Overview

TravelNest is a full-stack hotel booking platform with separate user, admin, backend, and data utility packages.

- `client/`: user-facing Vue 3 + Vite app.
- `admin-client/`: property owner/admin Nuxt 4 app.
- `server/`: Express API, background workers, data access, integrations, and infrastructure scripts.
- `scrape_data/`: utility scripts for scraping and inserting hotel data.
- `docs/`: project documentation and migration notes.

The repository uses Yarn workspaces at the root, but individual package READMEs also show `npm` commands. Prefer root workspace scripts when operating from the repo root.

## Root Commands

Run from the repository root:

```bash
yarn install
yarn dev:server
yarn dev:client
yarn dev:admin
yarn dev:bullmq-worker
yarn build:server
yarn build:client
yarn build:admin
yarn lint
yarn lint:fix
yarn test
```

Target a workspace directly when needed:

```bash
yarn workspace @travelnest/server test:unit
yarn workspace @travelnest/server test:integration
yarn workspace @travelnest/client test:unit
yarn workspace @travelnest/client test:e2e
yarn workspace @travelnest/admin-client typecheck
yarn workspace @travelnest/admin-client test:unit
```

Node.js `>=18` and Yarn `>=1.22` are expected.

## Environment Files

Use the format/example files as references. Do not commit real secrets.

- `server/.env.format`: API, MySQL, Redis, MongoDB, Elasticsearch, MinIO, Stripe, SMTP, OAuth, worker settings.
- `client/.env.format`: Vite variables such as `VITE_SERVER_HOST`, `VITE_STRIPE_PUBLIC_KEY`, `VITE_MINIO_URL`.
- `admin-client/.env.example`: currently shows `NITRO_PUBLIC_API_BASE`, while `admin-client/nuxt.config.ts` reads `NUXT_PUBLIC_API_BASE`; check both before changing config.
- `scrape_data/.env.format`: scraper location, API key, cookies, and MySQL settings.

The server loads `.env.${NODE_ENV}` in `server/server.js`; development usually means `server/.env.development`.

## Backend Architecture

The backend is CommonJS (`type: commonjs`) and starts from `server/server.js`, which loads env vars, creates the Express app from `server/app.js`, starts HTTP/Socket.IO, and handles graceful shutdown.

Important paths:

- `server/app.js`: Express setup, CORS, raw Stripe webhook route, JSON parsing, session/passport, rate limiter, Swagger, Bull Board, health routes, API routes, error handling.
- `server/routes/v1/`: API route definitions mounted under `/api/v1`.
- `server/validators/v1/`: Joi request schemas.
- `server/controllers/v1/`: HTTP handlers. Keep them thin.
- `server/services/`: business logic and orchestration.
- `server/repositories/`: database access. Repositories should be the layer that imports Sequelize models.
- `server/models/`: Sequelize models and associations; Mongo models live in `server/models/mongo/`.
- `server/infra/database/migrations/`: Sequelize migrations.
- `server/infra/database/seeders/`: development seed scripts.
- `server/infra/elasticsearch/`: Elasticsearch index setup and seeders.
- `server/infra/mongodb/`: Mongo analytics seeders.
- `server/queues/` and `server/workers/`: BullMQ queues and processors.
- `server/socket/`: Socket.IO setup and controllers.
- `server/adapters/`: external provider adapters, such as payments and webhooks.
- `server/middlewares/`: auth, CSRF, validation, sessions, logging, rate limiting, errors.

Backend aliases are registered through `server/register-aliases.js` and `_moduleAliases` in `server/package.json` (`@services`, `@repositories`, `@models`, `@config`, etc.). Use existing aliases when they are already used in nearby files.

Follow the existing backend flow for new endpoints:

1. Add or update Joi schema in `server/validators/v1/...`.
2. Add route in `server/routes/v1/...` and use the validation middleware.
3. Add controller in `server/controllers/v1/...`.
4. Put business logic in `server/services/...`.
5. Put Sequelize queries in `server/repositories/...`.
6. Add/update constants, helpers, queues, sockets, or adapters only when the feature needs them.
7. Add focused Jest tests under `server/__tests__/unit` or `server/__tests__/integration`.

Backend tests use Jest. Integration tests may require Docker/Testcontainers and local service availability.

## Backend Data And Services

Primary storage is MySQL via Sequelize. Redis is used for sessions, cache/rate limiting, and BullMQ. MongoDB stores analytics such as search logs and hotel view events. Elasticsearch powers search/log indexes. MinIO/S3-compatible storage handles media. Stripe, SMTP/Nodemailer, Infobip, OAuth providers, and Socket.IO are integrated.

Common setup commands from `server/`:

```bash
npm run db:init
npm run migrate
npm run seed:all:quick
npm run es:setup-hotels
npm run es:seed-hotels
npm run mongo:seed:search_logs
npm run mongo:seed:hotel_views
```

Use Elasticsearch/Mongo seed commands only when the task needs search or analytics data.

## User Client Architecture

The user app is Vue 3 with Vite, Vue Router, Vuex, Element Plus, SCSS, Leaflet, Socket.IO client, i18n, Toastification, and Stripe.js.

Important paths:

- `client/src/main.js`: app bootstrap, router, Vuex, i18n, global directive, toast plugin, styles.
- `client/src/router/`: route definitions and guards.
- `client/src/views/`: page-level views.
- `client/src/components/`: reusable UI components grouped by domain.
- `client/src/stores/`: Vuex modules split into `state.js`, `getters.js`, `mutations.js`, `actions.js`.
- `client/src/services/`: API and socket service modules.
- `client/src/request/`: request success/error helpers.
- `client/src/locales/`: `en.json` and `vi.json`.
- `client/src/assets/styles/`: SCSS variables, mixins, and global styles.

When changing user-facing text, update both English and Vietnamese locale files when applicable. Keep UI conventions consistent with nearby Vue components and Element Plus usage.

Client tests exist even though `client/README.md` says otherwise:

```bash
yarn workspace @travelnest/client test:unit
yarn workspace @travelnest/client test:component
yarn workspace @travelnest/client test:e2e
```

## Admin Client Architecture

The admin app is Nuxt 4 with Vue 3, Pinia, Tailwind CSS, Element Plus, TypeScript tooling, Vitest, and Playwright.

Important paths:

- `admin-client/nuxt.config.ts`: Nuxt modules, runtime config, Tailwind, dev server port `8000`.
- `admin-client/pages/`: file-based routes.
- `admin-client/layouts/`: Nuxt layouts.
- `admin-client/middleware/`: route middleware such as auth checks.
- `admin-client/stores/`: Pinia stores.
- `admin-client/composables/`: reusable composition functions.
- `admin-client/tests/unit/`: Vitest unit tests.
- `admin-client/tests/nuxt/`: Nuxt-aware tests.
- `admin-client/tests/e2e/`: Playwright tests.

Useful commands:

```bash
yarn workspace @travelnest/admin-client lint
yarn workspace @travelnest/admin-client typecheck
yarn workspace @travelnest/admin-client test:unit
yarn workspace @travelnest/admin-client test:nuxt
yarn workspace @travelnest/admin-client test:e2e
```

## Coding Conventions

- Match the style of nearby files before introducing new patterns.
- Backend code is CommonJS. Frontend/admin code uses ES modules; admin also uses TypeScript where present.
- Keep controllers thin and push business rules into services.
- Keep Sequelize model access in repositories.
- Use Joi validators for backend request inputs.
- Use the existing `ApiError`, `asyncHandler`, and error middleware patterns for API errors.
- Keep Stripe webhook routes raw-body compatible; do not move webhook JSON parsing behind `bodyParser.json()`.
- Respect session/cookie-based auth and CORS credentials behavior.
- For worker changes, update queue definitions, processors, and worker startup paths together.
- Avoid unrelated formatting churn, especially in Vue files.
- Do not edit generated or dependency directories such as `node_modules`, `.nuxt`, `.output`, `dist`, logs, or test result artifacts.

## Verification Guidance

Pick the smallest verification that covers the change:

- Backend service/repository change: `yarn workspace @travelnest/server test:unit`.
- Backend API or database flow: `yarn workspace @travelnest/server test:integration` if Docker/Testcontainers are available.
- User client component/store/service change: `yarn workspace @travelnest/client test:unit` or `test:component`.
- User client flow: `yarn workspace @travelnest/client test:e2e`.
- Admin component/store/page change: `yarn workspace @travelnest/admin-client test:unit` and `typecheck`.
- Admin route/runtime behavior: `yarn workspace @travelnest/admin-client test:nuxt` or `test:e2e`.
- Cross-package changes: run the relevant package tests plus root `yarn lint` if practical.

If a test cannot run because local services or Docker are unavailable, report that explicitly with the command attempted.

## Known Project Notes

- `deploy/` is referenced in the root README, but it may not exist in every checkout. Do not assume deployment docs are present.
- `client/README.md` appears stale about tests; rely on `client/package.json` for current scripts.
- `server/.env.format` contains a typo in `NODE_ENV=delelopment`; use `development` when running the server.
- Admin env naming may be inconsistent between `.env.example` and `nuxt.config.ts`; verify before making runtime config changes.
- Some local folders like `server/node_modules` and `admin-client/.nuxt` may be present in the working tree. Treat them as generated/dependency output.

