# TravelNest — Guest Flow Production-Readiness Report

_From the guest-flow end-to-end run (API + UI/UX) against the live local stack.
Date: 2026-10-07. See `guest-e2e-test-plan.md` for the plan and
`server/__tests__/e2e/` for the API suite._

## 1. Summary

| Suite | Result |
| --- | --- |
| API e2e (`server/__tests__/e2e`, live stack, Jest+supertest) | **82 / 82 pass** (stable over repeated runs) |
| Backend unit tests | **334 / 334 pass** |
| Architecture gate (`arch:check`) | **pass** |
| ESLint (changed + new files) | **0 errors** |
| UI/UX (Playwright MCP against the real Chrome) | U1, U3, U4, U7, U8, U9, **U10 (full pay → confirmation)**, U11 verified; U5/U12–U19 partial |

The API suite exercises the full pay path end-to-end, including the **Stripe
webhook round-trip** (`pending_payment → confirmed`).

## 2. How to run

```bash
# stack: infra + keycloak + backend (RATE_LIMIT_ENABLED=false) + frontend + stripe listen
yarn workspace @travelnest/server test:e2e          # API matrix
```

Env (defaults in `server/__tests__/e2e/env.js`): `E2E_USERNAME=test@travelnest.com`
/ `password123`; second guest `owner@travelnest.local` / `Test@1234`;
`E2E_CITY=Ha Noi`.

## 3. Defects found and fixed (agent commits `c97c8fa` … `67f6c4b`)

| # | Sev | Symptom | Root cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | S1 | **Authenticated search → 500** (anonymous worked) | `searchUseCases.recordRecentSearch` missing from the controller map after modularization | add the import |
| 2 | S1 | **`POST /bookings/:id/payment-intent` → 500** | payment `index.js` called methods on the Stripe adapter **class** without `new` | instantiate the adapter |
| 3 | S2 | Favorite a missing hotel → 500 | FK violation surfaced as a 500 | catch `FK` error → **404** |
| 4 | S2 | Concurrent double-cancel → 500 | `updateStatus` returned 0 rows on the losing race | → **409 `BOOKING_ALREADY_CANCELLED`** |
| 5 | S2 | Parallel same `Idempotency-Key` → 500 | unique-constraint race between lookup and insert | catch `UniqueConstraintError` → re-read & **replay/409** |
| 6 | **S1** | **UI checkout blocked** — "Next" never advanced | `Book.vue` rendered the **required** phone input with a hard-coded `disabled` and no binding | made it editable + `v-model`, wired into `checkFormFulfillment` and `CheckOut`; re-verified full UI pay → confirmation |
| 7 | S3 | `POST /user/favorite-hotels` always 400'd for real hotels | `hotelId` validated as a number, but hotel ids are UUIDs | schema → `Joi.string().uuid()` |
| 8 | S3 | `GET /payments/bookings/:bookingId` 400'd for real bookings | `bookingId`/`transactionId` validated as numbers | schema → `Joi.string().uuid()` |
| 9 | S3 | Shared `/search` link showed "0 hotels" + alert | `isSearchUrlValid` required an undocumented `numberOfDays` | derive it from the dates |
| 10 | S3 | Dates off-by-one; a 2-night stay showed "3 nights" | `new Date('YYYY-MM-DD')` parsed as UTC; nights hard-coded | TZ-safe formatting + computed nights |
| 11 | S4 | Placeholder typo "goging" | locale string | fixed |
| 12 | S3 | Confirmation header said "Booking.com" | hard-coded brand | fixed |
| 13 | S3 | Booking card titled with the city, raw date string | wrong field / `Date#toString` | hotel name + formatted dates |
| 14 | S3 | Keycloak silent-SSO console error on every load | Vite injected dev scripts into `silent-check-sso.html`; they `postMessage` objects keycloak-js tries to parse | serve it from the configured static dir |
| 15 | S2 | Webhook verification **skipped** when the secret is unset (fail-open) | no production guard | fail closed in production (`NODE_ENV=production`) |
| 16 | S4 | Form controls without an accessible name | missing `aria-label` / label association (header guest selector, results sort, hotel room-quantity + review filters, bookings filter) | added `aria-label`s; audit now reports **0** unlabeled visible controls on home/search/hotel/bookings |

Defects #1 and #2 broke **logged-in search** and the **entire payment step** —
both introduced by the recent "move Stripe adapters into payment" refactor.

## 4. Open defects (remaining)

| # | Sev | Area | Detail | Recommended fix |
| --- | --- | --- | --- | --- |
| D10 | S3 | Runtime deps | `analytics` and `notification` Go services run in Docker with **no published port** but the backend targets `localhost:8081`/`localhost:8083` → `/health` 503, trending 502, notifications 502. | Publish the ports / run them on the host, or point env at the compose DNS names. |

> D10 was worked around for this run with a temporary compose override
> (`/tmp/opencode/analytics-port.override.yml`, publishing 8081 + 8083). The
> repo's `docker-compose.yml` was left untouched.
>
> Fixed since the first draft: D1 (checkout), D2/D3 (UUID contracts),
> D4 (search days), D5 (dates/nights), D6 (typo), D7 (silent-SSO), D8 (a11y),
> D9 (booking card), D11 (branding) — see the fixed-defects table above.

## 5. Production-readiness matrix (R1–R18)

Status: **Fixed** / **Partial** / **Open** / **N-A (guest scope)**.

| # | Area | Status | Evidence / note |
| --- | --- | --- | --- |
| R1 | JWT key mgmt (static PEM, no JWKS) | Open | `jwt.util.js` reads `KEYCLOAK_PUBLIC_KEY_PEM`; no `kid`/JWKS. Rotation needs redeploy. Recommend JWKS + cache. |
| R2 | Rate limiting | **Fixed** | Redis-backed store (shared across instances), keyed per authenticated user (IP fallback); strict auth tier (30/15m) and a tighter write tier for hold/bookings/payments (60/15m) on top of the global 300/15m. `RATE_LIMIT_ENABLED=false` disables it (dev/e2e); fails open on Redis errors. |
| R3 | Log PII | **Fixed** | Request bodies are redacted (`utils/redact.js`) — passwords, tokens, card/payment fields and contact PII are masked before logging. Verified: a posted password/card no longer appears in `logs/`. |
| R4 | Webhook auth | **Fixed** | Signature verified when `STRIPE_WEBHOOK_SECRET` set; now **fails closed in production** when unset (was fail-open). |
| R5 | Hold oversell | **Verified** | Concurrency test E8: 6 parallel holds on one room → no 500, inventory stays usable. |
| R6 | Idempotency coverage | Partial | `POST /bookings` only. Holds/payments/cancels have no idempotency key. |
| R7 | Idempotency recovery | **Fixed** | A stale `processing` or `failed` record can be re-claimed after a 2-minute lease (`touchIdempotencyRecord`) instead of blocking the key for the full 24h TTL. |
| R8 | External I/O in DB txn | Open | `createPaymentIntent` (hold path) calls Stripe inside a DB transaction. |
| R9 | No outbox | N-A / Open | Events publish best-effort over NATS (not exercised in the guest run). |
| R10 | Search dependency (ES) | Verified up | ES healthy; hybrid search returns results. Degradation path not triggered. |
| R11 | XSS (`v-html` highlight) | **Fixed** | `highlightMatch` now HTML-escapes the hotel name and regex-escapes the query before building `<mark>`; previously a host-controlled name could inject script and a query containing `(` crashed the render. |
| R12 | Security headers (helmet) | **Fixed** | Added `helmet` (nosniff, frameguard, HSTS, referrer policy, DNS-prefetch off). CSP intentionally left to the edge (JSON API + Swagger UI); CORP set to `cross-origin` so assets stay loadable. |
| R13 | Body limits | Open | Global JSON limit 50 MB — tighten per route. |
| R14 | CORS | **Verified** | Disallowed origin is not granted `Access-Control-Allow-Origin` (J7). Rejection surfaces as a 500 rather than 403 (minor). |
| R15 | Startup config validation | **Fixed** | `config/validate-env.js` validates required env at boot — throws in production, warns otherwise (unit-tested). |
| R16 | Graceful shutdown | Open | Worker handles it; server drain not verified. |
| R17 | Perf / N+1 | Partial | `GET /health` ~20ms; list endpoints use paginated reads. No load test run. |
| R18 | Audit coverage | Partial | Webhook event log + idempotency records exist; guest-critical ops audit not asserted. |

## 6. Notable positives

- Full **payment → webhook → confirmed** path works (API).
- **Idempotent booking** (replay, key-reuse 409, parallel race) behaves correctly.
- **Concurrency**: oversell, double-submit and double-cancel races are handled without 5xx.
- **IDOR** protections hold across bookings/holds (403/404) and all protected routes 401 without a token.
- Structured errors **do not leak stacks/SQL**; parameterised raw SQL (no injection).
- Responsive layout has **no horizontal overflow** at 390px; images carry `alt`.
