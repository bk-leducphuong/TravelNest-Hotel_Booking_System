# H — Bookings (Guest): Supplementary evidence

## Concurrency (no 5xx) — 2026-10-09

**Parallel idempotent create** (same `Idempotency-Key`, 2 concurrent):

```
create1: 409  { code: "REQUEST_IN_PROGRESS" }
create2: 201  { bookingId: "01a1219d-4f96-…" }
```

**Parallel cancel** (2 concurrent `DELETE /bookings/:id`):

```
cancel1: 409  { code: "BOOKING_ALREADY_CANCELLED", message: "Booking is already cancelled" }
cancel2: 200  { message: "Booking cancelled successfully" }
```

**Booking from another user's hold** (User B uses User A's hold):

```
403 { code: "FORBIDDEN", message: "You do not have permission to use this hold" }
```

## Sequential double-cancel inconsistency (H-F4)

```
DELETE /bookings/:id  (1st) -> 200 cancelled
DELETE /bookings/:id  (2nd) -> 400 { code: "ALREADY_CANCELLED", message: "Booking is already cancelled" }
```

vs the concurrent race above which returns `409 BOOKING_ALREADY_CANCELLED`.
