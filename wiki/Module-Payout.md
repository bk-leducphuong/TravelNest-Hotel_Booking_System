# Payout Admin Module

`server/modules/payout` owns payouts, payout items and Stripe Connect accounts. Built on
the [Modular Monolith](Modular-Monolith) pattern.

## Ownership

| Table | Notes |
|---|---|
| `payouts` | Settlement to an owner/connected account (amount, fee, status, transfer id) |
| `payout_items` | Per-booking breakdown of a payout (gross / platform fee / net) |
| `connected_payment_accounts` | Stripe Connect accounts (per owner, optionally hotel-scoped) |

The payout service and repository were **moved into this module**
(`application/payout.service.js`, `infrastructure/payout.repository.js`) — they were
previously dead code in `services/` + `repositories/` and are now reachable.

## Admin API — `/api/v1/admin/payouts`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/` | `payment.read` | List payouts (filters + pagination) |
| GET | `/hotels/:hotelId/summary` | `payment.read` | Totals by status + payout readiness |
| POST | `/eligible` | `payment.process` | Generate payouts for eligible bookings |
| GET | `/connected-accounts` | `payment.read` | List connect accounts (by hotel or owner) |
| GET | `/connected-accounts/check` | `payment.read` | Has account / payout-ready? |
| POST | `/connected-accounts` | `payment.process` | Create a Stripe Connect account |
| POST | `/connected-accounts/:accountId/link` | `payment.process` | Create onboarding link (hosted URL) |
| POST | `/connected-accounts/:accountId/sync` | `payment.process` | Re-pull account status from Stripe |
| GET | `/:payoutId` | `payment.read` | Payout detail (items, hotel, owner, account, transaction) |
| POST | `/:payoutId/process` | `payment.process` | Execute the Stripe transfer |
| PATCH | `/:payoutId/status` | `payment.process` | Manual status override |

List filters: `hotelId`, `ownerId`, `connectedPaymentAccountId`, `transactionId`,
`status`, `dateFrom`, `dateTo`.

## Payout lifecycle (`domain/payout-rules.js`)

```
pending ──► processing ──► paid
   │            │
   ├────────────┴────────► failed ──► pending (retry) | cancelled
   └──────────► cancelled
```

`paid` and `cancelled` are terminal. `POST /:payoutId/process` only accepts `pending`
payouts.

### Generation

`POST /eligible` calls `createEligiblePayouts` — it scans confirmed/completed bookings
with a completed payment transaction and creates one payout + payout item per booking.
It is **idempotent per booking** via the unique `payout_items.booking_id`.

### Processing

`POST /:payoutId/process` calls `processStripeTransfer`, which:
1. requires a payout-ready connected account (`payouts_enabled` + `onboarding_status = completed`),
2. creates the Stripe transfer to `provider_account_id`,
3. marks the payout `paid`, writes the balanced ledger entry, and notifies the owner,
4. marks it `failed` (and notifies) on error.

## Stripe Connect onboarding

- `POST /connected-accounts` creates a Stripe account (`express` by default, with the
  `transfers` capability) and mirrors it locally.
- `POST /connected-accounts/:accountId/link` returns a hosted onboarding URL
  (`stripe.accountLinks`, `refresh_url`/`return_url` default to `CLIENT_HOST`).
- `POST /connected-accounts/:accountId/sync` re-pulls `charges_enabled`,
  `payouts_enabled`, `details_submitted`, requirements and derives
  `onboarding_status` (`not_started` → `pending` → `completed`, or `restricted`).
- `GET /connected-accounts/check` reports `configured` (Stripe key present),
  `hasAccount`, and `payoutReady`.

If `STRIPE_SECRET_KEY` is missing, write endpoints return `503 STRIPE_NOT_CONFIGURED`.

## Events & audit

- Emits `payout.batch_generated`, `payout.paid`, `payout.failed`.
- Every mutation writes an `audit_logs` entry (`payout.generated`, `payout.processed`,
  `payout.failed`, `payout.status_changed`, `payout.connect_account_created`,
  `payout.connect_account_synced`).
- Owner notifications for paid/failed are sent by the payout service.

## Files

```
modules/payout/
  domain/payout-rules.js
  infrastructure/{payout.repository,connected-account.repository,stripe-client}.js
  application/payout.service.js
  application/admin/{listPayouts,getPayout,getHotelPayoutSummary,generateEligiblePayouts,
                     processPayout,setPayoutStatus,listConnectedAccounts,checkConnectedAccount,
                     createConnectAccount,createAccountLink,syncConnectedAccount}.js
  api/{schemas,admin.controller,admin.routes}.js
  index.js
```

## Tests

`__tests__/unit/modules/payout/domain/` — status transitions, onboarding-status
derivation, payout-readiness checks.

## Follow-ups

- Schedule `generateEligiblePayouts` as a worker (BullMQ) instead of manual triggering.
- Owner self-onboarding (currently `payment.process`, admin-oriented) — needs hotel-scoped
  permissions so owners can create/link their own account.
- Handle `payout.paid`/`payout.failed` Stripe webhooks by reconciling `payouts` rows
  (the webhook currently only notifies).
- Retry policy / automatic re-processing for failed payouts.
