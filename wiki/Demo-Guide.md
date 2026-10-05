# Demo Guide

A repeatable path to bring up TravelNest and run a full guest + host demo.

## 1. Prerequisites

- **Node.js ≥ 20** and **Yarn 4** (`corepack enable && corepack prepare yarn@4.5.3 --activate`)
- **MySQL 8**, **Redis**, **MinIO**, **Elasticsearch**, **MongoDB** — start them with the
  repo's infra scripts (`make infra-*`) or your own instances.
- **Keycloak** — the app authenticates with Keycloak (realm `travelnest`; clients
  `travelnest-web` for the guest app and `travelnest-admin` for the admin app).
- Optional: **Go 1.22+** if you want to run the analytics / media / notification services.

```bash
yarn install
```

## 2. Start infrastructure

```bash
# from the repo root (uses server/.env.development by default)
make infra-mysql infra-redis infra-minio infra-elasticsearch infra-mongodb
```

## 3. Migrate + seed a demo dataset

```bash
yarn db:migrate     # apply migrations (schema is owned by migrations)
yarn demo:seed      # clear seed data, then seed everything incl. finance
```

`yarn demo:seed` = `seed:clear` + `seed-all --with-finance` (hotels, rooms, inventory,
users, staff, bookings, reviews, transactions/payments/payouts, images, Elasticsearch,
and MongoDB analytics). Use `--quick` for a smaller/faster dataset:

```bash
yarn workspace @travelnest/server seed:all:quick
```

## 4. Run the apps

```bash
yarn dev:server          # API            http://localhost:3000
yarn dev:client          # guest app      http://localhost:5173
yarn dev:admin           # admin console  http://localhost:8000
yarn dev:bullmq-worker   # background jobs (hold/booking expiry)

# optional microservices
yarn dev:analytics
yarn dev:media
yarn dev:notification
```

## 5. Demo accounts

The staff seeder creates deterministic accounts (password `Test@1234`, override with
`SEED_TEST_PASSWORD`). When Keycloak admin credentials are configured it also provisions
the matching Keycloak users, realm roles, `hotel_users` memberships and `hotels.owner_id`.

| Email | Role | Use |
|---|---|---|
| `admin@travelnest.local` | platform admin | full admin console, all hotels |
| `support@travelnest.local` | support agent | platform staff views |
| `owner@travelnest.local` | hotel owner | host/property management |
| `manager@travelnest.local` | hotel manager | hotel-scoped admin |
| `staff@travelnest.local` | hotel staff | hotel-scoped admin |

## 6. Suggested demo script

1. **Guest** — home → search by city/dates → hotel details → pick a room → hold →
   checkout (Stripe **test** card `4242 4242 4242 4242`) → confirmation → review.
2. **Host / property** — sign in as `owner@travelnest.local` → **Property** → edit
   details, add a room, edit a policy, upload a photo.
3. **Admin** — dashboard charts (bookings trend, occupancy, revenue), bookings,
   availability, payments/refunds, payouts, review moderation.

## 7. Known requirements & risks

- **Auth is Keycloak-only.** Make sure the realm/clients exist and the seeded accounts are
  provisioned before the demo; otherwise login fails. Set `SEED_TEST_PASSWORD` to a known
  value and re-run `seed:hotel_staff`.
- **External services** (MySQL/Redis/MinIO/Elasticsearch/Mongo/NATS/Keycloak) must be up.
  Search degrades if Elasticsearch is down; the hotel search-snapshot pipeline is seeded,
  not event-driven.
- **Stripe** must be in test mode with valid test keys for the payment step.

## 8. Verify before the demo

```bash
# backend
yarn workspace @travelnest/server arch:check
yarn workspace @travelnest/server schema:check
yarn workspace @travelnest/server test:unit

# clients
yarn workspace @travelnest/client lint
yarn workspace @travelnest/admin-client lint
```
