# Future Booking, Inventory, Payment, And Ledger Split

## Why This Split Comes Later

The current checkout path performs tightly coupled writes across:

- Holds
- Hold rooms
- Inventory
- Bookings
- Booking rooms
- Transactions
- Payments
- Ledger entries
- Idempotency keys

Splitting this first would force distributed transactions or a saga before simpler service boundaries are proven.

Because this project is for testing and learning, the split can still be aggressive later, but it should happen after analytics, media, notifications, search, and catalog are already extracted.

## Target Ownership

Booking/Inventory Service owns:

- Holds
- Hold rooms
- Room inventory
- Bookings
- Booking rooms
- Booking expiry
- Booking cancellation

Payment/Ledger Service owns:

- Payment intents
- Stripe webhooks
- Transactions
- Payments
- Refunds
- Payouts
- Ledger accounts
- Ledger entries

## Event Flow

Booking starts checkout:

```text
booking.hold.created.v1
booking.booking.created.v1
```

Payment service creates/updates payment state:

```text
payment.payment_intent.created.v1
payment.payment.succeeded.v1
payment.payment.failed.v1
```

Booking reacts to payment result:

```text
booking.booking.confirmed.v1
booking.booking.expired.v1
booking.booking.cancelled.v1
```

Notifications/search/analytics consume these events:

```text
notification.email.requested.v1
analytics.booking.confirmed.v1
search.booking.confirmed.v1
```

## Saga Direction

Use choreography first for learning:

- Booking service creates pending booking.
- Booking service publishes `booking.booking.created.v1`.
- Payment service consumes it and creates payment intent.
- Payment service publishes payment result events.
- Booking service consumes payment result and confirms/expires/cancels booking.

If coordination becomes hard, introduce an explicit checkout orchestrator later.

## Consistency Rules

- Inventory reservation must remain owned by Booking/Inventory Service.
- Payment service should not directly mutate booking rows.
- Booking service should not directly write payment/ledger rows.
- Payment success after booking expiry should trigger refund handling.
- All consumers must be idempotent.

## Migration Steps

1. Add events around current Node checkout behavior without changing ownership.
2. Add outbox table for booking/payment events.
3. Move hold expiry and booking expiry workers into Go Booking Service.
4. Move `/api/v1/hold` to Go.
5. Move `/api/v1/bookings` to Go.
6. Move Stripe webhook handling to Go Payment Service.
7. Move payment intent creation to Go Payment Service.
8. Move ledger writes to Go Payment Service.
9. Remove direct cross-domain DB writes from Node.

## Tests

- Create hold, verify inventory held.
- Expire hold, verify inventory released.
- Create booking from hold, verify inventory reserved.
- Payment succeeds, verify booking confirmed.
- Payment fails, verify booking remains pending or failed according to final policy.
- Booking expires before payment success, verify refund path.
- Duplicate webhook delivery does not duplicate transactions, payments, or ledger entries.

