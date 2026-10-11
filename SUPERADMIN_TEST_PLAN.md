# Superadmin Platform Console — Test Plan (Local)

> **Feature:** `feat/superadmin` — cross-tenant monitoring console (backend `server/modules/superadmin`, frontend `superadmin-client`).
> **Scope:** API tests (curl) + manual UI tests (Playwright MCP) + data/security acceptance criteria.
> **Environments:** local only (`localhost`).
> **Status:** draft for execution.

---

## 1. Scope

| Area | In scope |
|---|---|
| Platform session | `GET /api/v1/superadmin/me` |
| Overview KPIs | `GET /superadmin/overview` (+ snapshot freshness) |
| Hotels | `GET /superadmin/hotels`, `GET /superadmin/hotels/:hotelId` |
| Users | `GET /superadmin/users`, `GET /superadmin/users/:userId` (PII masking) |
| Audit | `GET /superadmin/audit` (+ PII-access entries) |
| Finance | `GET /superadmin/finance/{overview,payments,refunds,payouts,ledger}` |
| Cross-cutting | auth, permissions, validation, pagination, error envelopes, rate limit |
| UI | `superadmin-client` pages, nav gating, `/403`, PII display |
| Regression | legacy admin IDOR fix (D1) |

**Out of scope:** Phase 3 actions (ban/suspend/refund), payments write paths, Keycloak/DNS production provisioning.

---

## 2. Reference — endpoints, permissions, roles

**Base URL:** `http://localhost:3000/api/v1`

| Method | Path | Permission |
|---|---|---|
| GET | `/superadmin/me` | _(authenticated only)_ |
| GET | `/superadmin/overview` | `platform.overview.read` |
| GET | `/superadmin/hotels` | `platform.hotel.read` |
| GET | `/superadmin/hotels/:hotelId` | `platform.hotel.read` |
| GET | `/superadmin/users` | `platform.user.read` |
| GET | `/superadmin/users/:userId` | `platform.user.read` |
| GET | `/superadmin/audit` | `platform.audit.read` |
| GET | `/superadmin/finance/overview` | `platform.finance.read` |
| GET | `/superadmin/finance/payments` | `platform.finance.read` |
| GET | `/superadmin/finance/refunds` | `platform.finance.read` |
| GET | `/superadmin/finance/payouts` | `platform.finance.read` |
| GET | `/superadmin/finance/ledger` | `platform.finance.read` |

**Roles (global):** `admin` (all permissions, incl. `platform.user.pii_read`), `support_agent` (all `platform.*.read` **except** `platform.user.pii_read`), `user`/`owner`/`manager`/`staff` (no platform permissions).

**Response envelopes — note the two shapes:**
- Success: `{ "data": <payload>, "meta"?: { "page", "limit", "total" } }`
- Middleware errors (401/403/429): `{ "success": false, "message": "..." }`
- `ApiError` errors (400/404/500): `{ "error": { "code": "...", "message": "...", "fields"?: {...} } }`

**PII masking** (applies unless the caller holds `platform.user.pii_read`):
`email` → first 2 chars + `•••` + domain (e.g. `ow•••@example.com`); `phone` → `•••` + last 2 digits; `address`/`date_of_birth` → `•••`.

---

## 3. Preconditions / local setup

### 3.1 Infrastructure
- MySQL 8, Redis, MinIO, Elasticsearch, MongoDB up (`make infra-mysql infra-redis infra-minio infra-elasticsearch infra-mongodb`).
- Keycloak up at `http://localhost:8080` (realm `travelnest`), admin `admin`/`admin`.
- **Redis is required** for the rate limiter and the BullMQ snapshot job.

### 3.2 Migrate + seed
```bash
yarn db:migrate          # applies 20261011000000-create-platform-stat-snapshots
yarn demo:seed           # seeded accounts + finance data
```
Seeded accounts (password `Test@1234`): `admin@travelnest.local`, `support@travelnest.local`, `owner@travelnest.local`.

### 3.3 Backend env (`server/.env.development`)
Required for authenticated traffic (see `config/validate-env.js`):
```bash
NODE_ENV=development
KEYCLOAK_ISSUER=http://localhost:8080/realms/travelnest
KEYCLOAK_AUDIENCE=travelnest-web
KEYCLOAK_CLIENT_ID=travelnest-web
KEYCLOAK_PUBLIC_KEY_PEM="$(curl -s http://localhost:8080/realms/travelnest | jq -r '.public_key' | sed 's/^/-----BEGIN PUBLIC KEY-----\\n/; s/$/\\n-----END PUBLIC KEY-----/')"
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_ENABLED=true            # set false to skip throttling during manual runs
PLATFORM_STATS_REFRESH_INTERVAL_MS=60000
```
> ⚠️ Without `KEYCLOAK_PUBLIC_KEY_PEM` every authenticated request fails with `500 JWT_CONFIG_ERROR`.

### 3.4 Snapshot refresh
The overview reads precomputed snapshots. Populate once, or rely on the worker:
```bash
yarn workspace @travelnest/server stats:recompute   # one-off
# or run the worker (refreshes every PLATFORM_STATS_REFRESH_INTERVAL_MS)
yarn dev:bullmq-worker
```

### 3.5 Keycloak client + tokens for curl
`travelnest-superadmin` does not exist yet (D6). For API testing you only need a bearer token; for the UI you must create the client.

**Get a token (password grant):**
1. Keycloak admin console → Clients → `travelnest-web` → Settings → enable **Direct access grants**.
2. Then:
```bash
KC=http://localhost:8080/realms/travelnest
ADMIN_TOKEN=$(curl -s -X POST $KC/protocol/openid-connect/token \
  -d grant_type=password -d client_id=travelnest-web -d scope=openid \
  -d username=admin@travelnest.local -d password=Test@1234 | jq -r .access_token)

SUPPORT_TOKEN=$(curl -s -X POST $KC/protocol/openid-connect/token \
  -d grant_type=password -d client_id=travelnest-web -d scope=openid \
  -d username=support@travelnest.local -d password=Test@1234 | jq -r .access_token)

USER_TOKEN=$(curl -s -X POST $KC/protocol/openid-connect/token \
  -d grant_type=password -d client_id=travelnest-web -d scope=openid \
  -d username=owner@travelnest.local -d password=Test@1234 | jq -r .access_token)
```
_Alternative:_ sign in to the admin console (`:8000`) and copy the bearer token from devtools.

Verify the token has the realm role and audience:
```bash
echo $ADMIN_TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq '{realm_access, aud, azp}'
# expect realm_access.roles to include "admin"; aud/azp to include "travelnest-web"
```

### 3.6 Run the apps
```bash
yarn dev:server                 # API :3000
yarn dev:superadmin             # console :8100
```
**UI precondition:** create a public client `travelnest-superadmin` (PKCE S256, redirect `http://localhost:8100/*`, web origin `http://localhost:8100`), and set `superadmin-client/.env`:
```
NUXT_PUBLIC_API_BASE=http://localhost:3000/api/v1
NUXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NUXT_PUBLIC_KEYCLOAK_REALM=travelnest
NUXT_PUBLIC_KEYCLOAK_CLIENT_ID=travelnest-superadmin
NUXT_PUBLIC_KEYCLOAK_SILENT_CHECK_SSO_REDIRECT_URI=http://localhost:8100/silent-check-sso.html
```

---

## 4. Test identities

| Identity | Token var | Platform perms | Expected |
|---|---|---|---|
| Platform admin | `$ADMIN_TOKEN` | all incl. `pii_read` | full read, **unmasked** PII |
| Support agent | `$SUPPORT_TOKEN` | `platform.*.read` (no pii) | full read, **masked** PII |
| Non-platform (owner) | `$USER_TOKEN` | none | 403 on data routes; `/me` 200 |
| Anonymous | — | — | 401 |

---

## 5. API test matrix

### 5.1 Auth / session

```bash
curl -s $BASE/superadmin/me -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

| ID | Case | Expected |
|---|---|---|
| API-01 | `GET /me` with admin token | `200`, `data.globalRoles` includes `admin`, `data.permissions` includes all `platform.*` |
| API-02 | `GET /me` with support token | `200`, `data.globalRoles` includes `support_agent`, permissions **exclude** `platform.user.pii_read` |
| API-03 | `GET /me` with non-platform token | `200` (own session only; no `platform.*` perms) |
| API-04 | `GET /me` no token | `401`, `{success:false}` |
| API-05 | `GET /overview` no token | `401`, `{success:false}` |
| API-06 | `GET /overview` malformed token | `401`, `{success:false}` |

**Acceptance**
- [ ] **API-A1** Unauthenticated and invalid-token requests are rejected with `401` before any handler runs.
- [ ] **API-A2** `/me` succeeds for any authenticated user and never leaks other users' data.
- [ ] **API-A3** `globalRoles`/`permissions` returned by `/me` match the seeded role→permission mapping.

### 5.2 Overview

```bash
curl -s $BASE/superadmin/overview -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```
Expected shape:
```json
{ "data": { "hotels": {"total":N,"byStatus":{"active":N,...}},
            "users": {"total":N,"byStatus":{"active":N,"inactive":N,"banned":N}},
            "bookings": {"total":N},
            "generatedAt": "ISO"|null, "stale": false } }
```

| ID | Case | Expected |
|---|---|---|
| API-10 | admin / support | `200`, all counts present |
| API-11 | non-platform | `403`, `{success:false, message:"Insufficient permissions."}` |
| API-12 | before first snapshot (`stats:recompute` not run) | `200`, `stale:true`, `generatedAt:null`, counts 0 |
| API-13 | after `stats:recompute` | `200`, `stale:false`, `generatedAt` recent |

**Acceptance**
- [ ] **API-O1** Overview returns `200` for admin and support_agent; `403` for non-platform.
- [ ] **API-O2** `byStatus` keys exactly match the model enums (hotels: active/inactive/pending/suspended; users: active/inactive/banned).
- [ ] **API-O3** `stale` is `true` iff no snapshot exists; `generatedAt` equals the snapshot `computed_at`.

### 5.3 Hotels

```bash
curl -s "$BASE/superadmin/hotels?limit=5" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
curl -s "$BASE/superadmin/hotels?status=active&search=hotel" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
curl -s "$BASE/superadmin/hotels/<hotelId>" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

| ID | Case | Expected |
|---|---|---|
| API-20 | list, no filters | `200`, `meta {page,limit,total}`, each item `{id,name,status,hotelClass,minPrice,city,country,createdAt,owner}` |
| API-21 | `status=active` | only active hotels |
| API-22 | `search=<name substring>` | matching hotels |
| API-23 | `limit=500` | `400 VALIDATION_ERROR` (max 100) |
| API-24 | `status=bogus` | `400 VALIDATION_ERROR` |
| API-25 | `?foo=bar` | `400 VALIDATION_ERROR` (unknown query rejected) |
| API-26 | detail valid id | `200`, includes `members[]`, `counts{rooms,bookings,reviews}`, `rating` |
| API-27 | detail unknown id | `404`, `{error:{code:"NOT_FOUND", message:"Hotel not found."}}` |
| API-28 | detail invalid uuid | `400 VALIDATION_ERROR` |
| API-29 | support token, list + detail | `200` (owner email **masked**) |

**Acceptance**
- [ ] **API-H1** Pagination `meta.total` matches an independent `SELECT COUNT(*)`.
- [ ] **API-H2** `owner.email` is masked for support, unmasked for admin.
- [ ] **API-H3** Unknown/extra query params are rejected (no silent filtering).
- [ ] **API-H4** Detail returns 404 (not 403) for unknown ids; validation errors are 400.

### 5.4 Users (PII)

```bash
curl -s "$BASE/superadmin/users?limit=5" -H "Authorization: Bearer $SUPPORT_TOKEN" | jq '.data[0]'
curl -s "$BASE/superadmin/users?limit=5" -H "Authorization: Bearer $ADMIN_TOKEN"   | jq '.data[0]'
curl -s "$BASE/superadmin/users?role=admin" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
curl -s "$BASE/superadmin/users/<userId>" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

| ID | Case | Expected |
|---|---|---|
| API-30 | list as support | `200`, `email` masked (`xx•••@domain`), `phoneNumber` masked |
| API-31 | list as admin | `200`, `email`/`phoneNumber` **raw** |
| API-32 | `status=banned` | only banned users |
| API-33 | `role=admin` | only users with global role admin |
| API-34 | `search=<email substring>` | matching users |
| API-35 | detail as support | masked `email`, `phoneNumber`, `address`, `dateOfBirth`; `memberships[]`, `bookings.total` present |
| API-36 | detail as admin | raw PII |
| API-37 | unknown id | `404 NOT_FOUND` |
| API-38 | non-platform token | `403` |

**Acceptance**
- [ ] **API-U1** Masking is applied server-side: raw PII never appears in a support response body.
- [ ] **API-U2** Admin (holder of `platform.user.pii_read`) receives raw PII.
- [ ] **API-U3** `globalRoles` and `memberships` are correct for the user.

### 5.5 Audit

```bash
curl -s "$BASE/superadmin/audit?limit=5" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
curl -s "$BASE/superadmin/audit?action=platform.pii.read" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

| ID | Case | Expected |
|---|---|---|
| API-40 | list | `200`, newest first, `meta` present |
| API-41 | `action=platform.pii.read` | returns PII-access entries (see DATA-A1) |
| API-42 | `entityType=user` | filtered |
| API-43 | `from`/`to` ISO | filtered by `created_at` |
| API-44 | non-platform | `403` |

**Acceptance**
- [ ] **API-AU1** Audit list is filterable by action/entityType/entityId/actorUserId/hotelId/date range.
- [ ] **API-AU2** Entries are ordered by `created_at DESC`.

### 5.6 Finance

```bash
curl -s $BASE/superadmin/finance/overview -H "Authorization: Bearer $ADMIN_TOKEN" | jq
curl -s "$BASE/superadmin/finance/payments?limit=5" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
curl -s "$BASE/superadmin/finance/refunds?limit=5" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
curl -s "$BASE/superadmin/finance/payouts?limit=5" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
curl -s "$BASE/superadmin/finance/ledger?limit=5" -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

| ID | Case | Expected |
|---|---|---|
| API-50 | overview | `200`, `{gross,refunds,payoutsPaid,payoutsPending}` each `[{currency,count,amount}]`, `stale`/`generatedAt` |
| API-51 | payments | `200`, items `{id,amount,currency,status,method,hotel,buyer}`; buyer masked for support |
| API-52 | refunds | `200`, items include `reason`, `eligibility`, `buyer` |
| API-53 | payouts | `200`, items include `platformFeeAmount`, `owner` |
| API-54 | ledger | `200`, items include `account{name,accountType}`, `direction`, `eventType`, `refs{...}` |
| API-55 | `status=completed` (payments) | only completed |
| API-56 | `currency=usd` | normalized to `USD` |
| API-57 | `direction=debit` (ledger) | only debits |
| API-58 | `currency=US` | `400 VALIDATION_ERROR` (must be 3 chars) |
| API-59 | support token | `200`, buyer/owner masked |
| API-60 | non-platform | `403` |

**Acceptance**
- [ ] **API-F1** Overview aggregates are per-currency and match `platform_finance_totals` (see DATA-F1).
- [ ] **API-F2** Finance lists paginate and filter correctly; masked party emails for support.
- [ ] **API-F3** No finance endpoint mutates data (all `GET`).

### 5.7 Cross-cutting

| ID | Case | Expected |
|---|---|---|
| API-70 | `limit=0`, `page=0` | `400 VALIDATION_ERROR` |
| API-71 | default `limit` | `20` (audit: `50`) |
| API-72 | rate limit exceeded (see below) | `429`, `{success:false, message:"Too many monitoring requests..."}` |
| API-73 | unknown route `/superadmin/nope` | `404` |

**Rate limit check** (avoid spamming 120 calls):
```bash
# temporarily set RATE_LIMIT_ADMIN_READ_MAX=3 and restart the API, then:
for i in 1 2 3 4; do curl -s -o /dev/null -w "%{http_code}\n" $BASE/superadmin/overview -H "Authorization: Bearer $ADMIN_TOKEN"; done
# expect: 200 200 200 429
```

**Acceptance**
- [ ] **API-X1** Invalid pagination and filters return `400` with a `fields` map.
- [ ] **API-X2** The console is rate-limited separately from the global limiter (`RATE_LIMIT_ADMIN_READ_MAX`, default 120/15min).
- [ ] **API-X3** All list responses use `{data, meta{page,limit,total}}`.

---

## 6. Data acceptance criteria

| ID | Criterion | How to verify |
|---|---|---|
| DATA-O1 | Snapshot counts equal live DB counts | `stats:recompute`; compare `/overview` to `SELECT status, COUNT(*) FROM hotels GROUP BY status` (and users/bookings) |
| DATA-O2 | Snapshot is replaced, not appended | run `stats:recompute` twice; `platform_status_counts` row count stays constant |
| DATA-O3 | Freshness | `generatedAt` updates after a recompute; `stale:true` only when the table is empty |
| DATA-F1 | Finance totals match grouped sums | compare `platform_finance_totals` to `SELECT currency, COUNT(*), SUM(amount) FROM transactions WHERE transaction_type='payment' AND status='completed' GROUP BY currency` (and refunds/payouts) |
| DATA-P1 | PII masking format | `ow•••@example.com`, `•••23`, `•••` for address/DOB |
| DATA-A1 | PII-access auditing | after an **admin** reads `/users` or `/users/:id`, a new `audit_logs` row exists with `action='platform.pii.read'`, `actor_type='user'`, `entity_type='user'`; a **support** read does **not** create one |
| DATA-A2 | Audit is append-only | no endpoint mutates `audit_logs` |

**Acceptance**
- [ ] **DATA-A1** satisfied (this is the core D2 behaviour).
- [ ] **DATA-O1/DATA-F1** satisfied exactly (no rounding drift beyond currency decimals).

---

## 7. Security / authz acceptance criteria

| ID | Criterion |
|---|---|
| SEC-1 | Every `/superadmin/*` data route requires a bearer token and an explicit `platform.*` permission. |
| SEC-2 | `support_agent` is strictly read-only and never receives raw PII. |
| SEC-3 | `admin` may unmask PII and every unmask is audited. |
| SEC-4 | Non-platform authenticated users get `403` on data routes and are routed to `/403` in the UI. |
| SEC-5 | The internal ops token (`INTERNAL_SUPERADMIN_TOKEN`) is **not** accepted by `/superadmin/*`. |
| SEC-6 | An `admin` bearer session can no longer trigger `/internal/superadmin/{database,seeders,elasticsearch,mongodb}/*` (D7). |
| SEC-7 | Overview endpoints do not aggregate primary tables on the request path (no per-status COUNT / per-currency SUM in `superadmin.repository` / `finance.repository`). |

---

## 8. UI/UX acceptance criteria (Playwright MCP)

**Target:** `http://localhost:8100`. Drive with Playwright MCP; assert visually + via network.

| ID | Scenario | Steps | Acceptance |
|---|---|---|---|
| UI-01 | Login page | go to `/login` | Heading **“TravelNest Platform”**, button **“Sign in with TravelNest”** visible |
| UI-02 | Admin sign-in | sign in as `admin@travelnest.local` | lands on `/`; sidebar shows **Overview, Hotels, Users, Finance, Audit log**; header shows `admin` tag; email visible |
| UI-03 | Support sign-in | sign in as `support@travelnest.local` | same nav (support has all reads); **no** unmasked PII anywhere |
| UI-04 | Non-platform | sign in as `owner@travelnest.local` | redirected to `/403` (**“Access denied”**) with Sign out |
| UI-05 | Overview | `/` | 3 KPI cards (Hotels/Users/Bookings) + status breakdowns; **Refresh** reloads; shows `generatedAt` |
| UI-06 | Hotels list | `/hotels` | table: name (link), city, country, class, status tag, owner email, created; search + status filter work; pagination works |
| UI-07 | Hotel detail | click a hotel | back link; status tag; 4 count cards (Rooms/Bookings/Reviews/Rating); **Team** table (email, role, primary owner, joined) |
| UI-08 | Users list | `/users` | table: email (link), name, status tag, global roles tags, joined, last login; search + status + role filters; pagination |
| UI-09 | User detail | click a user | profile (phone/DOB/address/joined/last login/email verified), Access (roles, bookings), **Hotel memberships** table |
| UI-10 | PII masking | view `/users` as support vs admin | support sees `xx•••@domain`; admin sees raw emails |
| UI-11 | Finance overview | `/finance` | sub-nav (Overview/Payments/Refunds/Payouts/Ledger); per-currency KPI cards; empty-state when no data |
| UI-12 | Finance lists | `/finance/{payments,refunds,payouts,ledger}` | filters + tables + pagination render; amounts formatted as currency |
| UI-13 | Audit | `/audit` | action/entity filters; table (when, action, entity, actor, reason); pagination |
| UI-14 | Nav gating | inspect `SUPERADMIN_NAV` filtering | items hidden if the session lacks the matching permission |
| UI-15 | Session expiry | expire/clear token, navigate | redirected to login; 401 clears session |
| UI-16 | Empty/fresh DB | before snapshot | overview shows zeros without erroring (no crash) |

**UX acceptance**
- [ ] **UI-UX1** No console errors on any page; loading states (`v-loading`) shown during fetches.
- [ ] **UI-UX2** All tables show an empty state rather than breaking on zero rows.
- [ ] **UI-UX3** PII masking is visibly different between support and admin.
- [ ] **UI-UX4** `/403` is reachable and does not loop back to login.

---

## 9. Regression — legacy admin IDOR fix (D1)

These use the hotel-scoped admin API (not superadmin). Log in as `owner@travelnest.local` (hotel A) and try to reach hotel B's entities via ids.

| ID | Case | Expected |
|---|---|---|
| REG-01 | `GET /admin/bookings/:bookingId` (booking of another hotel), `X-Hotel-Id` = own hotel | `404` |
| REG-02 | `PATCH /admin/bookings/:bookingId/status` cross-hotel | `404`, no mutation |
| REG-03 | `GET /admin/payments/transactions/:transactionId` cross-hotel | `404` |
| REG-04 | `POST /admin/payments/transactions/:transactionId/refunds` cross-hotel | `404`, no refund |
| REG-05 | `GET /admin/payouts/:payoutId` cross-hotel | `404` |
| REG-06 | `GET /admin/reviews/:reviewId` cross-hotel | `404` |
| REG-07 | `GET /admin/inventory/rooms/:roomId` cross-hotel | `404` |
| REG-08 | `GET /admin/bookings/hotels/:otherHotelId/stats` with `X-Hotel-Id` = own | `403` (path hotel is authorized) |
| REG-09 | Same-hotel requests | still `200` (no regression) |
| REG-10 | Platform admin token on any hotel | `200` (intentional bypass) |

**Acceptance**
- [ ] **REG-A1** Cross-hotel entity ids return `404` (not the other tenant's data).
- [ ] **REG-A2** Path-hotel routes authorize against the path hotel, not the header.
- [ ] **REG-A3** Same-hotel and platform-staff access unchanged.

---

## 10. Exit criteria

- [ ] All **API-***, **DATA-***, **SEC-***, **UI-***, **REG-*** acceptance items pass.
- [ ] No raw PII observed in any support_agent response or UI view.
- [ ] A `platform.pii.read` audit row is created for admin PII reads and **not** for support.
- [ ] `/overview` and `/finance/overview` reflect the snapshot (`stale:false`, `generatedAt` recent) after a recompute.
- [ ] Cross-hotel admin requests return `404`.
- [ ] Rate-limit, validation, and error-envelope checks pass.

---

## 11. Known limitations / notes

1. **Keycloak client `travelnest-superadmin` is not provisioned yet (D6)** — the UI cannot be exercised until you create it (public, PKCE, redirect `http://localhost:8100/*`).
2. **`travelnest-web`/`travelnest-admin` have direct access grants disabled** — enable it (or add a test client) to obtain curl tokens via password grant.
3. **`KEYCLOAK_PUBLIC_KEY_PEM` must be set** or all authenticated calls return `500`.
4. **Snapshot freshness** is bounded by the refresh interval (default 60s); on a cold DB, run `stats:recompute` first.
5. **Rate limiter** keys by user id (falls back to IP); lower `RATE_LIMIT_ADMIN_READ_MAX` to test `429` quickly.
6. **Legacy `/internal/superadmin/*`** destructive routes now require the internal token (D7) — verify SEC-6 by confirming an admin bearer is rejected there.
