# Payment & Refunds Module

`server/modules/payment` owns the admin surface for transactions and refunds, built on
the [Modular Monolith](Modular-Monolith) pattern.

## Ownership

| Table | Notes |
|---|---|
| `transactions` | Payment/refund/payout records, provider ids, status |
| `payments` | Card/payment records attached to a transaction |
| `refunds` | Refund records (admin and webhook origin) |

Ledger entries are written through the existing `services/ledger.service.js`
(double-entry). Consolidating ledger ownership into this module is a follow-up.

## Admin API — `/api/v1/admin/payments`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/transactions` | `payment.read` | List transactions (filters + pagination) |
| GET | `/transactions/:transactionId` | `payment.read` | Transaction detail (payments, refunds, booking, hotel, buyer) |
| GET | `/hotels/:hotelId/summary` | `payment.read` | Gross / refunded / net summary |
| POST | `/transactions/:transactionId/refunds` | `payment.refund` | Initiate a (partial or full) refund |
| GET | `/refunds` | `payment.read` | List refunds (filters + pagination) |
| GET | `/refunds/:refundId` | `payment.read` | Refund detail |
| POST | `/refunds/:refundId/retry` | `payment.refund` | Retry a failed refund |

Transaction filters: `hotelId`, `status`, `transactionType`, `bookingId`, `buyerId`,
`dateFrom`, `dateTo`. Refund filters: `hotelId`, `status`, `transactionId`, `dateFrom`,
`dateTo`.

### Initiate a refund

```http
POST /api/v1/admin/payments/transactions/:transactionId/refunds
{ "amount": 45.00, "reason": "customer_request" }
```

`amount` is optional — omit it to refund the full remaining balance. `reason` is one of
`free_cancellation`, `customer_request`, `hotel_cancelled`, `duplicate`, `fraudulent`,
`other`.

Response:

```json
{
  "data": {
    "refundId": "…",
    "providerRefundId": "re_…",
    "status": "succeeded",
    "amount": 45,
    "currency": "USD",
    "transactionStatus": "partially_refunded"
  }
}
```

## Rules & guards (`domain/refund-rules.js`)

- Only `payment` transactions in `completed` / `partially_refunded` are refundable.
- A Stripe charge must exist and the transaction must be linked to a booking.
- The remaining refundable amount is `amount − Σ(active refunds)`
  (active = `pending|processing|succeeded`).
- Over-refunding is rejected (`REFUND_EXCEEDS_REMAINING`); a refund in progress for the
  same transaction is rejected (`REFUND_IN_PROGRESS`).
- On success the transaction becomes `refunded` (full) or `partially_refunded` (partial),
  and the ledger records a balanced refund entry.
- **Refunds do not cancel the booking or release inventory.** That is a separate booking
  action, so a partial compensation refund doesn't silently cancel a stay.
- Stripe only accepts `duplicate` / `fraudulent` / `requested_by_customer`; all other
  reasons map to `requested_by_customer` for the provider while the true reason is stored
  locally.

## Webhook reconciliation

`services/payment.service.js#handleRefundSucceeded` was hardened so both admin-initiated
and provider (Stripe dashboard) refunds reconcile correctly:

- **Idempotent** — if a refund with that provider refund id is already `succeeded`, it
  returns early. Admin refunds that later arrive via `charge.refunded` are not
  double-counted and don't post duplicate ledger entries.
- Records a local refund row for refunds created outside the app.
- Sets the transaction to `refunded`/`partially_refunded`.
- **Only a full refund cancels the booking and releases inventory**; partial refunds no
  longer cancel the stay.

## Events & audit

- Emits `payment.refund_created`, `payment.refund_succeeded`, `payment.refund_failed`.
- The `payment.refund_succeeded` subscriber notifies the guest
  (`notification.publisher.publishRefundCreated`).
- Every attempt writes an `audit_logs` entry (`payment.refund_succeeded` /
  `payment.refund_failed`).

## Files

```
modules/payment/
  domain/refund-rules.js
  infrastructure/{transaction.repository,refund.repository}.js
  application/admin/{listTransactions,getTransaction,getHotelPaymentSummary,initiateRefund,retryRefund,processRefundAttempt,listRefunds,getRefund}.js
  api/{schemas,admin.controller,admin.routes}.js
  events/subscribers.js
  index.js
```

`refundCharge` was added to `StripePaymentAdapter` (and the provider interface) so a
refund can be created directly against a charge without an extra payment-intent lookup.

## Tests

`__tests__/unit/modules/payment/domain/` — reason/status normalization, refundable
amounts, over-refund guards, full vs partial status.

## Follow-ups

- Idempotency-Key support on refund initiation (repository already exists).
- Consolidate `services/payment.service.js` and `services/ledger.service.js` into the
  module.
- Payout execution has moved to the [Payout module](Module-Payout) (`payout.service.js`
  was previously unwired dead code).
- Hotel-scoped permission checks and admin refund limits/thresholds.
