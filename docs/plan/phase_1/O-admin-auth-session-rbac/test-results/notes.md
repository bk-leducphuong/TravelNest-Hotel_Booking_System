# O — Admin Auth, Session & RBAC: Supplementary evidence

## RBAC matrix (2026-10-09)

Roles seeded with password `Test@1234`. Manager/staff belong to hotel
`01a105dc-2510-74f5-a07f-c79bab3b0002` ("The Poplar Road Inn"); owner owns the same hotel.

| Request | Actor | Result |
|---|---|---|
| `GET /admin/me` | admin / support / owner / manager / staff / guest | 200 (roles + permissions + hotels) |
| `GET /admin/bookings` | admin | 200 |
| `GET /admin/bookings` | guest | 400 "Hotel context is required" (O-F2) |
| `GET /admin/payouts` | guest | 400 "Hotel context is required" (O-F2) |
| `GET /admin/inventory/hotels/<own>/rooms` | manager | 200 |
| `GET /admin/inventory/hotels/<own>/rooms` | staff | 200 |
| `GET /admin/inventory/hotels/<foreign>/rooms` | manager | 403 |
| `POST /admin/hotels/<own>/rooms` | manager (`room.create`) | **201** |
| `POST /admin/hotels/<own>/rooms` | staff (no `room.create`) | **403** |
| `GET /admin/payouts` (X-Hotel-Id own) | staff (no `payment.read`) | 403 |
| `GET /admin/bookings` (no hotel ctx) | support_agent | 200 |
| `GET /admin/payouts` (no hotel ctx) | support_agent | 200 |
| **`GET /admin/hotels`** | **guest** | **200 — 20 hotels (O-F1)** |
| `GET /admin/hotels/<id>` | guest | 403 "You do not have access to this hotel." |

## O-F3 — soft-deleted room still listed

`DELETE /admin/hotels/<own>/rooms/<id>` → 200, but the room remains in the list with
`status: "inactive"` (confirmed in DB: `status='inactive'`). Hard-removed manually afterwards.

## /admin/me shape (admin)

```json
{ "user": {"id":"…","email":"admin@travelnest.local"},
  "globalRoles": ["admin"],
  "tokenRoles": ["offline_access","admin","default-roles-travelnest","uma_authorization"],
  "permissions": ["admin.dashboard","admin.manage_hotels", … ,"review.moderate", …] }
```

Guest `/admin/me` has `hotels: []` and a reduced permission set (includes `hotel.read`).
