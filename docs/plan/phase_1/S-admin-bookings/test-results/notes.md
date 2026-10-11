# S — Admin Bookings: Supplementary evidence

## S-F1 — cross-hotel IDOR (read / write / cancel)

Actor: `manager@travelnest.local` — member of hotel `01a105dc-2510-74f5-a07f-c79bab3b0002`.
Target booking: `01a105e0-2501-7e40-8ff3-391be9102c3c` — belongs to hotel
`01a105dc-2486-7012-8bef-52e5747b5362` (manager is **not** a member). Sent header
`X-Hotel-Id: 01a105dc-2510-…` (own hotel).

```
GET   /admin/bookings/01a105e0-2501-…                          -> 200   (foreign booking data)
PATCH /admin/bookings/01a105e0-2501-…/status {"status":"checked_in"} -> 200
POST  /admin/bookings/01a105e0-2501-…/cancel {"reason":"IDOR probe"}  -> 200
```

By contrast, `GET /admin/bookings/hotels/<foreignHotel>/stats` → `403`, because there the hotel
context comes from the **path param** and is checked.

## Status state machine ✅

```
PATCH /admin/bookings/<own>/status {"status":"completed"}   (from confirmed) -> 409
  {"error":{"code":"INVALID_BOOKING_STATUS_TRANSITION","message":"Cannot change booking status from 'confirmed' to 'completed'"}}
PATCH /admin/bookings/<own>/status {"status":"checked_in"}                   -> 200
PATCH /admin/bookings/<own>/status {"status":"banana"}                       -> 400
```

## Cleanup

Both mutated bookings (`01a105e0-328d-…` own, `01a105e0-2501-…` foreign) were reset to
`confirmed` via SQL after the run.
