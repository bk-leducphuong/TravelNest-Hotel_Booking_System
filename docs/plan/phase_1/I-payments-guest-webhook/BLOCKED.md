# I — Payments (Guest) & Stripe Webhook

> **Status:** ⏸ Blocked — not reviewed in this pass.

## Why

Reviewing this feature end-to-end requires the **Stripe CLI** (`stripe listen
--forward-to http://localhost:3000/api/v1/webhooks/stripe`) to deliver webhook events and
exercise the `pending_payment → confirmed` reconciliation. The Stripe CLI was **not
available** at review time (2026-10-10), so webhook delivery could not be tested.

## What was covered indirectly

- **Payment-intent creation works** and is exercised under feature
  [H — Bookings](../H-bookings-guest/): `POST /bookings/:id/payment-intent` →
  `201` with a real Stripe test-mode `clientSecret` (`pi_3UOhAw…_secret_…`). See
  [H api.md](../H-bookings-guest/test-results/api.md) H-API-08.
- Failure/signature/envelope behaviour of `POST /webhooks/stripe` is **not verified**.

## To unblock

1. Install/start the Stripe CLI and run `stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe` (copy the `whsec_…` into `STRIPE_WEBHOOK_SECRET`).
2. Re-run the checklist below.

## Planned cases (when unblocked)

| # | Case | Type | Expected |
|---|------|------|----------|
| I-API-01 | create intent for `pending_payment` booking | API | 201 `clientSecret` |
| I-API-02 | reuse existing intent (idempotent) | API | same intent, no duplicate |
| I-API-03 | intent for non-pending booking | API | 4xx |
| I-API-04 | `GET /payments`, `/payments/bookings/:id`, `/payments/transactions/:id` | API | 200, scoped |
| I-API-05 | webhook signature valid → `pending_payment → confirmed` | API | 200, status confirmed |
| I-API-06 | webhook invalid/missing signature | Security | rejected (fail-closed in prod) |
| I-API-07 | webhook replay (same event id) | Data | idempotent, no double-confirm |
| I-API-08 | refund path → `payment.refund_*` events | API | refund recorded |
| I-UI-01 | Stripe payment element + success page | UI/UX | confirms booking |
