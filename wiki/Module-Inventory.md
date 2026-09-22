# Inventory Admin Module

`server/modules/inventory` owns the admin surface for room availability, allotment and
pricing. Built on the [Modular Monolith](Modular-Monolith) pattern.

## Ownership

| Table | Notes |
|---|---|
| `room_inventory` | One row per room per date: `total_rooms`, `booked_rooms`, `held_rooms`, `status`, `price_per_night`, `currency` |

`booked_rooms` and `held_rooms` are **system-managed** (booking/hold flows). Admins edit
only **allotment (`total_rooms`)**, **price**, **currency** and **status**.

Room metadata (`rooms`) is owned by a minimal **Catalog** module seam
(`modules/catalog` → `getRoomsForHotel`, `getRoomById`), so Inventory never queries the
`rooms` table directly.

## Admin API — `/api/v1/admin/inventory`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/hotels/:hotelId/rooms` | `room.read` | Rooms + aggregated inventory per room |
| GET | `/hotels/:hotelId/occupancy` | `room.read` | Occupancy/revenue summary |
| GET | `/rooms/:roomId` | `room.read` | Per-day inventory (calendar cells) |
| PATCH | `/rooms/:roomId` | `room.manage_inventory` | Bulk update allotment/price/status |

All GETs accept `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`. When omitted the range
defaults to `[today, today + 30 days]`.

### Bulk update

**Range mode** — apply the same change across a date range:

```http
PATCH /api/v1/admin/inventory/rooms/:roomId
{
  "startDate": "2026-07-01",
  "endDate": "2026-07-31",
  "pricePerNight": 120,
  "totalRooms": 8,
  "status": "open",
  "reason": "Summer rate"
}
```

**Entries mode** — per-date changes:

```http
PATCH /api/v1/admin/inventory/rooms/:roomId
{
  "entries": [
    { "date": "2026-07-01", "status": "close" },
    { "date": "2026-07-02", "pricePerNight": 150 }
  ]
}
```

Blocking dates is just `status: "close"` (`"closed"` is accepted as an alias).

### Rules & guards

- Statuses: `open | close | sold_out | maintenance`.
- Currency is validated against the platform allow-list (`constants/common.js`).
- **`totalRooms` cannot drop below already-booked rooms** → `409 INVENTORY_BELOW_BOOKED`.
- When creating a missing date row, price is inherited from the room's latest row; if none
  exists, `pricePerNight` is required → `400 INVENTORY_PRICE_REQUIRED`. Allotment defaults
  to the room's `quantity`.
- The whole bulk update is **transactional**.

## Events & audit

- Emits `inventory.changed` → subscriber refreshes the search snapshot
  (`emitRoomInventoryChanged`).
- Writes `audit_logs` entry `inventory.updated` with the date range / entries summary.

## Files

```
modules/catalog/                     # room metadata seam
modules/inventory/
  domain/inventory-rules.js          # status/currency/date-range rules
  infrastructure/inventory.repository.js
  application/admin/{listRoomInventory,getRoomInventory,updateRoomInventory,getHotelOccupancy}.js
  api/{schemas,admin.controller,admin.routes}.js
  events/subscribers.js
  index.js
```

## Tests

`__tests__/unit/modules/inventory/domain/` — status/currency normalization, date
enumeration and range limits, default range.

## Follow-ups

- Consolidate the guest booking-path inventory operations (`services/inventory.service.js`)
  into this module and fix the known oversell race.
- Hotel-scoped permission check (`requireHotelContext`).
- Integration tests for the aggregate/upsert SQL.
