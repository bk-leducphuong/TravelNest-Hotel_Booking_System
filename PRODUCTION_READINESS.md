# TravelNest — Guest Flow Production-Readiness Report

_From the guest-flow end-to-end run (API + UI/UX) against the live local stack.
Date: 2026-10-07. See `guest-e2e-test-plan.md` for the plan and
`server/__tests__/e2e/` for the API suite._

## 1. Summary

| Suite | Result |
| --- | --- |
| API e2e (`server/__tests__/e2e`, live stack, Jest+supertest) | **82 / 82 pass** (stable over repeated runs) |
| Backend unit tests | **320 / 320 pass** |
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

## 3. Defects found and fixed (agent changes, commit `c97c8fa`)

| # | Sev | Symptom | Root cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | S1 | **Authenticated search → 500** (anonymous worked) | `searchUseCases.recordRecentSearch` missing from the controller map after modularization | add the import |
| 2 | S1 | **`POST /bookings/:id/payment-intent` → 500** | payment `index.js` called methods on the Stripe adapter **class** without `new` | instantiate the adapter |
| 3 | S2 | Favorite a missing hotel → 500 | FK violation surfaced as a 500 | catch `FK` error → **404** |
| 4 | S2 | Concurrent double-cancel → 500 | `updateStatus` returned 0 rows on the losing race | → **409 `BOOKING_ALREADY_CANCELLED`** |
| 5 | S2 | Parallel same `Idempotency-Key` → 500 | unique-constraint race between lookup and insert | catch `UniqueConstraintError` → re-read & **replay/409** |
| 6 | **S1** | **UI checkout blocked** — "Next" never advanced | `Book.vue` rendered the **required** phone input with a hard-coded `disabled` and no binding | made it editable + `v-model`, wired into `checkFormFulfillment` and `CheckOut`; re-verified full UI pay → confirmation |

Defects #1 and #2 broke **logged-in search** and the **entire payment step** —
both introduced by the recent "move Stripe adapters into payment" refactor.

## 4. Open defects (documented, not fixed)

| # | Sev | Area | Detail | Recommended fix |
| --- | --- | --- | --- | --- |
| D1 | **S1** | UI checkout | `client/src/views/Book.vue:298-306` renders the **required** phone `input` with a hard-coded `disabled`. Users without a saved phone cannot complete checkout (value also isn't `v-model`-bound, so typing would be ignored). | Make the field editable + bound (`v-model`), or prefill/require it in the profile step. |
| D2 | S3 | Favorites contract | `POST /user/favorite-hotels` types `hotelId` as a **number**; hotel IDs are UUIDs → always 400. (`test.failing` H2) | Accept a UUID string in the schema. |
| D3 | S3 | Payments contract | `GET /payments/bookings/:bookingId` & `/transactions/:transactionId` type IDs as **numbers**; booking IDs are UUIDs. (`test.failing` Y1) | Accept UUID strings. |
| D4 | S3 | Search UX | `/search` silently shows **"Found 0 hotels"** + an alert unless the undocumented `numberOfDays` query param is present (`isSearchUrlValid`). | Derive `numberOfDays` from the dates; include it in the documented route contract. |
| D5 | S3 | Dates | Off-by-one between the search dates and the in-page stay panel (query 27→29, panel 26→28); the confirmation page shows a 2-night stay as **"3 nights"**; the checkout used **stale dates** from the previous search. | Normalise to one date source / timezone-safe formatting. |
| D6 | S4 | i18n/UX | Typo in the destination placeholder: **"Where are you goging?"**; header renders `Đăng kýĐăng nhập` with no spacing. | Fix the locale strings. |
| D7 | S3 | Console | On every load: `TypeError: Failed to construct 'URL': Invalid URL` from `keycloak-js parseCallbackUrl_fn` (silent-check-sso). | Fix the silent-check-sso URL / Keycloak callback handling. |
| D8 | S4 | a11y | 40 `input`/`select` elements without an `aria-label`, `placeholder` or `id` on the search page. | Associate labels with controls. |
| D9 | S3 | Bookings UI | Booking cards show the **city** ("Ha Noi") as the title and the raw date `Wed Oct 07 2026`; hotel name not shown. | Show the hotel name + formatted dates. |
| D10 | S3 | Runtime deps | `analytics` and `notification` Go services run in Docker with **no published port** but the backend targets `localhost:8081`/`localhost:8083` → `/health` 503, trending 502, notifications 502. | Publish the ports / run them on the host, or point env at the compose DNS names. |
| D11 | S3 | Branding | The booking confirmation page header renders **"Booking.com"**, not "TravelNest". | Fix the confirmation header brand. |

> D10 was worked around for this run with a temporary compose override
> (`/tmp/opencode/analytics-port.override.yml`, publishing 8081 + 8083). The
> repo's `docker-compose.yml` was left untouched.

## 5. Production-readiness matrix (R1–R18)

Status: **Fixed** / **Partial** / **Open** / **N-A (guest scope)**.

| # | Area | Status | Evidence / note |
| --- | --- | --- | --- |
| R1 | JWT key mgmt (static PEM, no JWKS) | Open | `jwt.util.js` reads `KEYCLOAK_PUBLIC_KEY_PEM`; no `kid`/JWKS. Rotation needs redeploy. Recommend JWKS + cache. |
| R2 | Rate limiting | Partial | Per-IP, in-memory, 300/15m. Added **`RATE_LIMIT_ENABLED`** toggle (off in dev). Still per-IP and not shared across instances. |
| R3 | Log PII | Open | `request-logger` logs response bodies; verified bodies are masked in error.log but confirm no PII for auth/payment payloads. |
| R4 | Webhook auth | Partial | Signature verified when `STRIPE_WEBHOOK_SECRET` set; **skipped with a warning if unset**. Fail closed in production. |
| R5 | Hold oversell | **Verified** | Concurrency test E8: 6 parallel holds on one room → no 500, inventory stays usable. |
| R6 | Idempotency coverage | Partial | `POST /bookings` only. Holds/payments/cancels have no idempotency key. |
| R7 | Idempotency recovery | Partial | Race now handled (fix #5). The 24h `processing` TTL with no lease remains a recovery gap. |
| R8 | External I/O in DB txn | Open | `createPaymentIntent` (hold path) calls Stripe inside a DB transaction. |
| R9 | No outbox | N-A / Open | Events publish best-effort over NATS (not exercised in the guest run). |
| R10 | Search dependency (ES) | Verified up | ES healthy; hybrid search returns results. Degradation path not triggered. |
| R11 | XSS (`v-html` highlight) | Open | `SearchResults.vue` uses `v-html` for match highlighting — needs escaping review. |
| R12 | Security headers (helmet) | Open | No helmet/CSP. |
| R13 | Body limits | Open | Global JSON limit 50 MB — tighten per route. |
| R14 | CORS | **Verified** | Disallowed origin is not granted `Access-Control-Allow-Origin` (J7). Rejection surfaces as a 500 rather than 403 (minor). |
| R15 | Startup config validation | Open | Missing env throws at request time. |
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
