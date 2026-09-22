# Security

This page records the security hardening applied to the API and the environment
variables it relies on. See also [Modular Monolith](Modular-Monolith) for how admin
surfaces are authorised.

## Fixed issues

### 1. Internal superadmin API was fully unauthenticated

`/api/v1/internal/superadmin/*` (DB init, seeders, Elasticsearch/Mongo seeding, bulk
email/in-app notifications) had every guard commented out — anyone could trigger them.

- The whole router is now protected: `router.use(requireInternalSuperadmin)`
  (`routes/v1/internalSuperadmin.routes.js`).
- `requireInternalSuperadmin` accepts **either** a configured internal token
  (`INTERNAL_SUPERADMIN_TOKEN` / `SUPERADMIN_API_TOKEN` via `x-internal-superadmin-token`
  or `Authorization: Bearer …`) **or** a valid Keycloak bearer token with the `admin`
  role and an active account.
- The token comparison is now **constant-time** (`crypto.timingSafeEqual`), removing the
  timing side-channel from the previous `===`.

> If a token was ever deployed while these routes were open, rotate it.

### 2. Image upload/delete was unauthenticated (and had no ownership check)

`POST/PUT/DELETE /api/v1/images/*` had no auth at all — anonymous upload and deletion for
any hotel/room/review.

- Writes now require a bearer token (`authenticate`).
- Ownership is enforced by `middlewares/image-auth.middleware.js`:
  - platform admins → any entity,
  - hotel owners/managers/staff → entities belonging to their hotel (hotel/room/review),
  - a user → only their own avatar (`user_avatar`),
  - catalog imagery (`city`/`country`) → platform admins only.
- `DELETE /images/:id` resolves the owning entity before authorising; unknown ids fall
  through to the controller's 404 without leaking existence.
- `GET /images/:entityType/:entityId` stays public (storefront imagery).

### 3. Bull Board queue dashboard was public

`/admin/queues` exposed queue internals and job payloads.

- Disabled by default: returns `404` unless `ENABLE_BULL_BOARD=true`.
- When enabled, requires **HTTP Basic auth** (`BULL_BOARD_USERNAME`/`BULL_BOARD_PASSWORD`);
  missing credentials → `503`, wrong credentials → `401` (WWW-Authenticate). Comparisons are
  constant-time.

### 4. Rate limiting was disabled

`app.use(limiter)` was commented out.

- Enabled globally (15-minute window, default 300 requests/IP; `RATE_LIMIT_MAX` to tune).
- Skips `/api/v1/webhooks/*` (provider-driven) and `/health` (k8s probes).
- Set `TRUST_PROXY` when running behind an ingress/load balancer so client IPs are read
  from `X-Forwarded-For` (e.g. `TRUST_PROXY=1`). Without it, all traffic shares the
  proxy's IP bucket.

### 5. SQL injection in the admin dashboard repository

`repositories/admin/dashboard.repository.js#getNewCustomers` interpolated `hotelId` and
`startDate` into a raw SQL literal.

- Values are now escaped with `sequelize.escape(...)`.

### 6. Auth failures now return a correct 401

`authenticateRequest` threw a plain `Error`, which the error middleware mapped to `500`.

- It now throws `ApiError(401, 'AUTHENTICATION_REQUIRED', …)`, so internal/admin routes
  return a proper `401` instead of a misleading `500`.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `INTERNAL_SUPERADMIN_TOKEN` / `SUPERADMIN_API_TOKEN` | Token access for `/internal/superadmin` | unset (token access disabled; admin bearer still works) |
| `ENABLE_BULL_BOARD` | Expose the queue dashboard | `false` |
| `BULL_BOARD_USERNAME` / `BULL_BOARD_PASSWORD` | Basic-auth credentials for Bull Board | unset |
| `RATE_LIMIT_MAX` | Requests per IP per 15 min | `300` |
| `TRUST_PROXY` | Trust `X-Forwarded-For` (`true`/`1`/`false`/count) | unset (no trust) |

## Tests

`__tests__/unit/middlewares/`
- `image-auth.middleware.test.js` — admin/hotel-role/self-avatar/catalog/malformed-id cases.
- `bull-board-auth.middleware.test.js` — disabled/enabled/unauthenticated/authenticated.
- `internal-superadmin.middleware.test.js` — constant-time comparison.

Smoke checks confirm `/internal/superadmin/*` and image writes return `401` without a
token.

## Residual risks / next

- `POST /join/photos` (partner application) is intentionally public and accepts file
  uploads; it is now rate-limited but should be reviewed for size/count limits and abuse
  controls.
- Admin routes are hotel-scoped via `requirePermission(perm, { requireHotelContext: true })`
  and `GET /api/v1/admin/me`; the admin client sends `X-Hotel-Id` and gates UI on the
  returned permissions.
- Consider `helmet` (security headers) and a tightened CORS allow-list.
- Rotate any secrets that were reachable while the issues above were live.
