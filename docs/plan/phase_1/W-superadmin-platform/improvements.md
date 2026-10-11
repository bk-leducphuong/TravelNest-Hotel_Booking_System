# W — Superadmin Platform: Improvements

## Backlog

| # | Finding | Severity | Proposed fix | Effort | Owner | Status |
|---|---------|----------|--------------|--------|-------|--------|
| W-F1 | `users?role=` → 500 (`Unknown column 'roles.role_id'`) | **S2** | Avoid the alias/table collision: resolve the user ids via `UserRoles.findAll({ include: [{ association: 'role', where: { name: role } }] })` and filter `where.id = { [Op.in]: ids }` — or add a literal `EXISTS` subquery. (The nested-include path aliases the outer `user_roles` as `roles`, clashing with the `roles` table.) | S | | ✅ Done (M7) |
| W-F2 | Hotel detail `owner` always `null` | S3 | Look up the primary owner in `getHotel` (reuse `findPrimaryOwnersByHotelIds([hotelId])`) instead of passing `null`; or drop the field from the detail serializer and rely on `members[]`. | XS | | ✅ Done (M7) |
| W-F3 | Keycloak `parseCallbackUrl` console error (3×) | S3 | Port the guest fix (`guardNonStringMessages` — drop same-origin non-string `postMessage`s during the silent check) from `client/src/services/keycloak.service.js` into `superadmin-client/services/keycloak.ts` (and `admin-client`). | XS | | ✅ Done (M7) |
| W-F4 | Audit rows are snake_case vs camelCase elsewhere | S4 | Either add a serializer to `auditService.list` (camelCase) for consistency, or document that the audit endpoint returns raw rows. | XS | | ✅ Done (M7) |

## Coverage gaps (not defects)

| # | Gap | Notes |
|---|-----|-------|
| W-G1 | UI-15 (session expiry) | Not force-tested. Logout → `/login` works; 401 handling lives in `stores/auth.ts`. |
| W-G2 | UI-16 (empty/fresh DB) | Not tested — needs a cold `platform_status_counts` table. Code returns zeros with `stale:true` when the snapshot is empty (`getOverviewSnapshot` → `null`). |
| W-G3 | API-12 (pre-snapshot `stale:true`) | Not tested (snapshot already populated); the code path is `getOverviewSnapshot() === null` → zeros + `stale:true`. |

## Changes applied (M7)

- **W-F1** — `server/modules/superadmin/infrastructure/superadmin.repository.js`: `listUsers` now
  resolves the user ids holding the requested global role in a separate `UserRoles` query
  (`where.id = { [Op.in]: ids }`) instead of the colliding nested include.
- **W-F2** — `server/modules/superadmin/application/hotel-admin.service.js`: `getHotel` looks up the
  primary owner (`findPrimaryOwnersByHotelIds([hotelId])`) instead of passing `null`.
- **W-F3** — `superadmin-client/services/keycloak.ts` (+ `admin-client/services/keycloak.ts`): ported
  `guardNonStringMessages` (drops same-origin non-string `postMessage`s during the silent check) and
  the fragment-strip on the redirect URI.
- **W-F4** — `server/modules/superadmin/api/superadmin.controller.js`: added a camelCase
  `serializeAuditEntry`; updated `superadmin-client/services/api/audit.ts` +
  `pages/audit/index.vue` to the camelCase shape.
- Tests: `hotel-admin.service.test.js` updated for the owner lookup; `controller.test.js` gains a
  camelCase-serialization test.

## Verification (M7)

- API: `users?role=admin` → 200 (1), `role=user` → 200, `role=nosuchrole` → 200 (0);
  hotel detail `owner` non-null (raw for admin, `ow•••@` for support); audit → camelCase.
- Browser: console **0 errors** (was 3); `/audit` renders When/Entity/Actor.
- Suites: **390/390** server unit, superadmin-client 16/16, admin-client 38/38; prettier + arch +
  typecheck clean; superadmin + admin builds pass.

## Notes

- **D6 resolved**: the `travelnest-superadmin` Keycloak client now exists (public, PKCE,
  redirect `http://localhost:8100/*`), so the console UI is fully exercisable.
- The console is read-only by design — no Phase-3 actions (ban/suspend/refund) are in scope.
- The 429 path requires `RATE_LIMIT_ENABLED=true` (dev ships it `false`); verified by temporarily
  setting `RATE_LIMIT_ADMIN_READ_MAX=3` (env restored afterwards).
- Re-test after fixes: `users?role=admin` → 200 filtered; hotel detail `owner` non-null for the
  primary-owner hotel; 0 console errors on the console; audit casing decision applied.
