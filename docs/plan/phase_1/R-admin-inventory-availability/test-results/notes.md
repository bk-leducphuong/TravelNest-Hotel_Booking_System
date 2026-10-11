# R — Admin Inventory / Availability: Supplementary evidence

## R-F1 — cross-hotel IDOR (read + write)

Setup:
- Manager (`manager@travelnest.local`) is a member of hotel `01a105dc-2510-74f5-a07f-c79bab3b0002`.
- Target room `01a105dc-2796-7bff-b5f7-36a5633c03d1` ("Single 733") belongs to a **different** hotel `01a105dc-24d4-7ffc-98e0-32d730d886d1`.

```
PATCH /admin/inventory/rooms/01a105dc-2796-…   (X-Hotel-Id: 01a105dc-2510-…)
  Authorization: Bearer <manager>                                   -> 200

GET   /admin/inventory/rooms/01a105dc-2796-…?startDate=2026-10-09&endDate=2026-10-11
  X-Hotel-Id: 01a105dc-2510-…                                       -> 200
  body: { data: { roomName: "Single 733", days: [ … 3 ] } }        // foreign room data
```

The route (`/admin/inventory/rooms/:roomId`) has no `hotelId` param, so the middleware
(`requireHotelPermission(ROOM_MANAGE_INVENTORY)`) resolves the hotel purely from `X-Hotel-Id`
and never compares it to `rooms.hotel_id`. The use-case loads the room by id and writes its
inventory regardless of hotel.

## Oversell guard ✅

```
PATCH /admin/inventory/rooms/<own>/ { startDate:"2026-11-06", endDate:"2026-11-06", totalRooms:1 }
  (2026-11-06 has bookedRooms: 2)                                   -> 409
  {"error":{"code":"INVENTORY_BELOW_BOOKED","message":"Cannot set total rooms below the 2 already booked on 2026-11-06"}}
```

## R-F2 — price inheritance

```
PATCH /admin/inventory/rooms/<own>/ { startDate:"2027-06-01", endDate:"2027-06-01", totalRooms:5 }
  -> 200   (no price supplied; inherited the room's latest price_per_night)
```

`INVENTORY_PRICE_REQUIRED` fires only when the room has **no** prior inventory row. The created
`2027-06-01` row was removed afterwards.
