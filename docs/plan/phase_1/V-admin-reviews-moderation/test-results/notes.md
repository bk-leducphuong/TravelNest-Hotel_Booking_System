# V — Admin Reviews & Moderation: Supplementary evidence

## V-F1 — cross-hotel IDOR

Actor: **owner** of hotel `01a105dc-2510-…` (`X-Hotel-Id: 01a105dc-2510-…`).
Foreign review `01a105e2-59c3-…` belongs to hotel `01a105dc-24d4-…`.

```
GET  /admin/reviews/01a105e2-59c3-…                    -> 200  (foreign review data)
POST /admin/reviews/01a105e2-59c3-…/reply {"reply":"IDOR probe reply"} -> 201  (reply created on foreign review)
```

The created reply was deleted afterwards (via the same route).

Contrast: `GET /admin/reviews/summary?hotelId=<foreign>` → `403`.

## V-F2 — owner bypasses permission checks

Owner role permissions: `["review.create","review.read","review.reply","review.update"]` — **no
`review.moderate`**. Yet:

```
PATCH /admin/reviews/<own>/status {"status":"hidden"}   (owner)  -> 200
```

because `requirePermission` treats `hotelRoleName === 'owner'` as passing any hotel-scoped
permission.

## Reply lifecycle ✅ (owner, review.reply)

```
POST   /admin/reviews/<own>/reply  {"reply":"…"} -> 201
PATCH  /admin/reviews/<own>/reply  {"reply":"…"} -> 200
DELETE /admin/reviews/<own>/reply                -> 200
```
