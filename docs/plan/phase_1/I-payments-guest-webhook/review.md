# I — Payments (Guest) & Stripe Webhook: Review

> Unblocked 2026-10-11 — the Stripe CLI (`stripe listen --forward-to
> localhost:3000/api/v1/webhooks/stripe`) became available, so the webhook round-trip could be
> exercised. Previously recorded as blocked in `BLOCKED.md` (now removed).

## Findings

| # | Sev | Axis | Symptom | Root cause | Evidence | Status |
|---|-----|------|---------|-----------|----------|--------|
| I-F1 | S2 | API/contract | `GET /payments/bookings/:bookingId` → **500** `Unknown column 'transactions.booking_code' in 'where clause'` | `payment.repository.findPaymentByBookingId` looked up the booking's `booking_code` and then filtered `transactions` by `booking_code` — but `transactions` has no such column (it links via `booking_id`) | [api.md](./test-results/api.md) I-API-04b | ✅ Fixed |
| I-F2 | S2 | API/contract / Security | `GET /payments/transactions/:transactionId` → **403** for the owner | Controller ran the **UUID** through `parseInt(transactionId, 10)`, yielding `1`; MySQL then numerically coerced `id = 1`, matching a **different buyer's** row, so the ownership check rejected it. Latent cross-buyer read (mitigated only by the post-fetch `buyer_id` check) | [api.md](./test-results/api.md) I-API-04c | ✅ Fixed |

### Notes on I-F2

Because transaction ids are UUIDv7 (`01a1…`), `parseInt` produced the numeric prefix `1`.
MySQL's implicit string→number coercion made `WHERE id = 1` match any row whose id shares that
numeric prefix. The use-case's `payment.buyer_id !== userId` guard prevented **disclosure**, but
the endpoint returned the wrong result (403) and the query was one missing guard away from a
cross-buyer read — hence S2.

## What was verified (no findings)

- **Signature verification is fail-closed**: invalid and missing signatures both → `400 Invalid
  signature` (I-API-06).
- **Idempotency**: `webhookAdapter.isDuplicate(event.id)` short-circuits replays (200
  `{received:true,duplicate:true}`) and `webhook_event_log` records the audit trail (I-API-07).
- **Intent reuse** is idempotent — the same `paymentIntentId` is returned (I-API-02).
- **Non-pending bookings** cannot create an intent → 400 `BOOKING_NOT_PENDING_PAYMENT` (I-API-03).
- **Ownership scoping** on the payment reads: own → 200, other buyer → 403, unknown → 404.
- **Webhook → confirmed** reconciliation works against the real Stripe CLI (e2e `G2`).

## Verdict

**🟡 Partial.** The payment-intent lifecycle, webhook security/idempotency and scoping are sound.
Two S2 endpoint bugs (I-F1, I-F2) were found and fixed in this pass. The only residual gap is
UI coverage (I-UI-01 — the Stripe payment element was not driven in-browser).
