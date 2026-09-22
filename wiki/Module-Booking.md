# Booking Admin Module

`server/modules/booking` owns the admin surface for reservations, plus the public read
seam used by [Review & Moderation](Module-Review). Built on the
[Modular Monolith](Modular-Monolith) pattern.

## Ownership

| Table | Notes |
|---|---|
| `bookings` | Reservation header, status, dates, pricing snapshot |
| `booking_rooms` | Per-room lines of a booking (multi-room support) |

It also **reads** `transactions` / `refunds` through the
[Payment module](Module-Payment) — it never queries payment tables directly.
Inventory is released through the [Inventory module](Module-Inventory) interface
(`releaseRooms`).

## Public interface (`modules/booking/index.js`)

| Function | Used by |
|---|---|
| `getCompletedBookingForReview({ bookingCode, buyerId, hotelId })` | Review module (review eligibility) |
| `adminRoutes` | Admin BFF |

## Admin API — `/api/v1/admin/bookings`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/` | `booking.read` | List bookings (filters + pagination) |
| GET | `/hotels/:hotelId/stats` | `booking.read` | Status breakdown + today's arrivals/departures |
| GET | `/:bookingId` | `booking.read` | Booking detail (guest, hotel, room, rooms, transaction/refunds) |
| PATCH | `/:bookingId/status` | `booking.manage` | Confirm / check-in / complete / no-show |
| POST | `/:bookingId/cancel` | `booking.cancel` | Force-cancel (releases inventory, optional refund) |

List filters: `hotelId`, `status`, `bookingCode`, `roomId`, `buyerId`, `dateFrom`,
`dateTo`, `page`, `limit`.

## Status state machine (`domain/booking-status.js`)

```
pending | pending_payment | payment_failed ──► confirmed ──► checked_in ──► completed
                        │                          │             │
                        └──────────► cancelled ◄───┴─────────────┘
confirmed ──► no_show
```

- Terminal: `completed`, `cancelled`, `expired`, `no_show`.
- `cancelled` is only reachable through the **cancel endpoint** (so inventory is always
  released); `PATCH /status` with `cancelled` is rejected with `USE_CANCEL_ENDPOINT`.

```http
PATCH /api/v1/admin/bookings/:bookingId/status
{ "status": "checked_in" }
```

## Force-cancel

```http
POST /api/v1/admin/bookings/:bookingId/cancel
{ "reason": "guest no-show", "processRefund": true }
```

- Releases reserved/held inventory and sets `cancelled` **atomically** in one DB
  transaction.
- `processRefund` (default `false`) calls the Payment module
  (`refundBooking`) to refund the attached transaction. A refund failure is returned as
  `refundError` rather than silently swallowed — the cancellation itself still succeeds
  because it is already committed.
- Refunded value is reported in the response (`refund`), and the booking gets an
  `audit_logs` entry (`booking.force_cancelled`).

## Guest cancellation fix

`services/booking.service.js#cancelBooking` previously flipped the status **without**
releasing inventory, leaking `booked_rooms` forever. It now releases the booking's rooms
(`booking_rooms`, falling back to the legacy `room_id`/`quantity`) and updates the status
in a single transaction.

## Events & audit

- Emits `booking.status_changed`, `booking.cancelled`, `booking.completed`.
- `booking.completed` subscriber refreshes the hotel search snapshot
  (`emitBookingCompleted`).
- Every mutation writes an audit entry (`booking.status_changed`,
  `booking.force_cancelled`).

## Files

```
modules/booking/
  domain/booking-status.js
  infrastructure/booking-admin.repository.js   # admin reads/writes
  application/admin/{listBookings,getBooking,getBookingStats,updateBookingStatus,forceCancelBooking}.js
  api/{schemas,admin.controller,admin.routes}.js
  events/subscribers.js
  index.js
```

## Tests

`__tests__/unit/modules/booking/domain/` — status transitions, terminal states, and which
statuses require inventory release.

## Follow-ups

- Amend booking (dates/rooms) with pricing re-quote and inventory delta.
- Hotel-scoped permission checks (`requireHotelContext`) so owners only see their hotel.
- Migrate the guest booking path (`services/booking.service.js`) into this module.
