# W — Superadmin Platform: Review

Date: 2026-10-11 · Environment: local stack (API `:3000`, console `:8100`, Keycloak `:8080`).
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/ui.md`](./test-results/ui.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| W-F1 | **S2** | API/contract | `GET /superadmin/users?role=<role>` → **500** `Unknown column 'roles.role_id' in 'on clause'` | `superadmin.repository.listUsers` builds `Users → association 'roles' (user_roles) → association 'role' (roles)`. The outer alias **`roles`** (user_roles) collides with the nested model **table `roles`**, so the generated join references `roles.role_id` on the wrong table. | api.md API-33, server error log | ✅ Fixed (M7) |
| W-F2 | S3 | API/contract | `GET /superadmin/hotels/:hotelId` returns `owner: null` **unconditionally**, even for a hotel that has a primary owner (list endpoint returns it correctly). | `hotel-admin.service.getHotel` calls `serializeHotel(hotel, null, options)` — the owner argument is hardcoded `null`; only `listHotels` looks up owners. | api.md API-26, ui.md UI-07 | ✅ Fixed (M7) |
| W-F3 | S3 | UI/UX | The console logs **3× `TypeError: Failed to construct 'URL': Invalid URL`** (keycloak-js `parseCallbackUrl`) on load. | The guest-client fix for **A-F9/D-F2** (`guardNonStringMessages` in `client/src/services/keycloak.service.js`) was **not applied** to `superadmin-client/services/keycloak.ts` (nor `admin-client`). | ui.md UI-UX1 | ✅ Fixed (M7) |
| W-F4 | S4 | API/contract | The `audit` endpoint returns **snake_case** rows (`entity_type`, `actor_user_id`, `created_at`) while every other superadmin endpoint serializes **camelCase** (`hotelClass`, `phoneNumber`, `createdAt`). | `auditService.list` returns raw model rows without a serializer. The console handles it (`row.created_at`), so it is cosmetic. | api.md API-40, `pages/audit/index.vue` | ✅ Fixed (M7) |

## Positives (verified)

- **RBAC is correct and central**: every data route requires a bearer token **and** an explicit
  `platform.*` permission; non-platform users get **403** with the standard envelope, and the console
  routes them to `/403`. `support_agent` is strictly read-only (no write routes exist).
- **PII masking is server-side**: support never receives raw PII — `te•••@travelnest.com`, `•••67`,
  `•••` for address/DOB (users, hotel owners, finance buyers). Admin (holder of
  `platform.user.pii_read`) gets raw values.
- **Unmask auditing works (DATA-A1)**: admin PII reads create `platform.pii.read` audit rows
  (37 present); support reads create none.
- **Snapshot architecture is sound (SEC-7)**: `/overview` and `/finance/overview` read only
  `platform_status_counts` / `platform_finance_totals`; the expensive aggregation lives in
  `recompute()` off the request path. `stale`/`generatedAt` behave correctly.
- **Data accuracy**: snapshot counts equal live DB counts after a recompute (hotels 12600, users 83,
  bookings 441740); recompute **replaces** rows (10 → 10), not appends.
- **Cross-hotel IDOR regression holds**: REG-01/03/06/07/08 → 403; same-hotel → 200; platform admin
  → 200 (the path-hotel fix for REG-08 works).
- **Validation & errors**: unknown query params → 400, bad UUID → 400, unknown id → 404, unknown
  route → 404; the dedicated `adminReadLimiter` returns **429** with `Too many monitoring requests…`.
- **UI renders correctly** across overview, hotels, users, finance (5 views), audit, `/403`, login.

## Verdict

**🟡 Partial.** The platform console is well-architected — read-only, permission-gated, snapshot-backed,
server-side PII masking with unmask auditing, and a working cross-hotel regression. One **S2** bug
(`?role=` filter 500) breaks a documented filter, plus three smaller issues (dead `owner` field,
the Keycloak console error, and an audit casing inconsistency). All are contained and quick to fix.
