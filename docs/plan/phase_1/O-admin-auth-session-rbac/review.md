# O — Admin Auth, Session & RBAC: Review

Date: 2026-10-09 · Environment: local dev stack (API :3000, admin :8000, Keycloak :8080).
Evidence: [`test-results/api.md`](./test-results/api.md), [`test-results/notes.md`](./test-results/notes.md), [`test-results/browser.md`](./test-results/browser.md).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| O-F1 | S3 | Security/authz | **Any authenticated guest can list the admin catalog**: `GET /admin/hotels` returns **200 with 20 hotels** for `test@travelnest.com`, and the admin UI shows the Properties list (with a "Manage" link that then 403s). | The admin catalog **list** route uses `requirePermission(HOTEL_READ)` *without* hotel context, and the base `user` role holds `hotel.read`. The scoped `GET /admin/hotels/:id` correctly 403s. | notes.md, browser.md | Open |
| O-F2 | S4 | API/contract | A guest hitting hotel-scoped admin routes (`/admin/bookings`, `/admin/payouts`) gets **400 "Hotel context is required"** instead of **403**. | `requirePermission` returns 400 when no hotel id is resolvable before checking membership. | api.md O-API-04/05 | Open |
| O-F3 | S4 | UI/UX | Soft-deleted rooms still appear in the admin rooms list (`status: inactive`). | Delete is a soft delete; the list doesn't filter inactive. | notes.md | Open |

## Positives

- **RBAC enforcement is strong and correct** (verified across roles):
  - `/admin/me` returns global roles, effective permissions (union), and per-hotel memberships + permissions for every role.
  - Hotel-scoped: **manager/staff → 200 for their own hotel**, **403 for a foreign hotel**.
  - Per-permission gating: **manager `room.create` → 201**, **staff `room.create` → 403**; **staff `payment.read` (payouts) → 403**.
  - Platform staff (`support_agent`) act globally with their permissions → `200` on bookings/payouts with no hotel context.
  - No token → `401`.
- The middleware deliberately **does not OR global permissions into hotel-scoped checks** (so a `staff` member can't inherit `booking.cancel` from the global `user` role) — a correct, subtle design.
- Admin UI: global auth guard (`middleware/auth.global.ts`), `usePermissions` mirrors the server (platform staff → global perms; hotel roles → active-hotel perms), `Can.vue` gates UI, and clear empty states ("No hotel assigned", "Select a hotel").

## Notes / limitations

- The admin client shares the realm SSO session, so it rendered as the **guest** (`test@travelnest.com`). Attempts to switch to `admin@travelnest.local` via the UI logout did not take (SSO persisted) — positive admin-UI rendering is therefore inferred from the guest empty states + code; the RBAC behaviour itself is proven at the API.
- Test room created for the `room.create` check was cleaned up (soft-deleted, then hard-removed).

## Verdict

**🟡 Partial.** The RBAC implementation is one of the strongest parts of the system — scoping,
cross-hotel denial, and per-permission gating all behave correctly. The one real gap is **O-F1**:
the admin catalog list is exposed to any guest (data is public, but the admin surface should not
be). O-F2/O-F3 are minor. Fix O-F1 and this is production-ready.
