# O — Admin Auth, Session & RBAC: Browser evidence

Admin client (Nuxt) at `http://localhost:8000`, 2026-10-09. The browser shares the realm SSO
session, so it rendered as **test@travelnest.com** (the guest).

## Guard & empty states ✅

- `/` → dashboard as `test@travelnest.com`, with "**No hotel is assigned to your account. Ask an
  administrator to add you to a hotel.**" (correct empty state for a user with no hotels).
- `/bookings` → "Select a hotel to view its bookings."
- `/payments` → "Select a hotel to view payments." (+ Refunds)
- `/payouts` → "Select a hotel to view payouts." (+ Connected accounts)

The global guard (`middleware/auth.global.ts`) initialises Keycloak, redirects unauthenticated
users to login, loads `/admin/me`, and keeps signed-in users off `/login`.

## O-F1 — guest sees the admin Properties list

`/properties` (as the guest) renders the catalog: "**Hotel House** / 433 Moen Divide Apt. 674 /
Manage". Confirmed via API: guest `GET /admin/hotels` → **200, 20 hotels** (the base `user` role
holds `hotel.read`; the list route checks that permission globally). The scoped detail
(`/admin/hotels/:id`) correctly returns 403.

## Permission gating (code)

`composables/usePermissions.ts`:

```ts
const effectivePermissions = computed(() =>
  isPlatformStaff.value ? auth.permissions : (auth.activeHotel?.permissions ?? [])
);
```

`components/Can.vue` renders its slot only when `can`/`canAny` passes — mirroring the server's
"platform staff use global permissions, hotel roles use the active hotel's permissions" rule.

## Limitation

Switching to `admin@travelnest.local` via the UI logout did not take (SSO session persisted), so
positive **admin-role** UI rendering was not captured; RBAC correctness is proven at the API
level (see `notes.md`).
