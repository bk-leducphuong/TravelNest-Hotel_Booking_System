# Hotel Owner Payouts

Payouts transfer the hotel owner's share of a completed, paid booking from the
platform's Stripe balance to the owner's Stripe Connect account.

## Flow

```
Guest pays (PaymentIntent)
  → ledger credits hotel_owner_payable (net of platform fee)
  → booking checks out
  → refund hold period (PAYOUT_HOLD_DAYS) passes
  → payout generation groups eligible bookings per hotel/owner/currency
  → payout row + one payout_items row per booking (status pending)
  → processing claims the row and creates a Stripe transfer to the Connect account
  → ledger debits hotel_owner_payable and credits platform_cash
  → payout status paid, owner notified
```

Generation is idempotent per booking: `payout_items.booking_id` is unique. A
concurrent run that loses the race rolls its whole group back and the next run
picks it up.

## Eligibility

A booking is eligible when:

- status is `confirmed` or `completed`;
- it has a `completed` `payment` transaction;
- `check_out_date <= now - PAYOUT_HOLD_DAYS`;
- it has no `pending`/`processing` refund;
- its `cancellation_decision.outcome` is not `refund_required`/`manual_review`;
- it is not already in `payout_items`.

The hotel must have a payout-ready connected account (`payouts_enabled = true`
and `onboarding_status = completed`). Hotels without one are skipped, not
failed, so onboarding gaps do not block other hotels.

## Grouping

One payout is created per `(hotel_id, owner_id, currency)` per generation run.
Each booking contributes one `payout_items` row with its gross, platform fee,
and net amount. If refund reservations or owner debt reduce the payable
balance, the transfer amount is clamped and the difference is recorded as
`metadata.owner_debt_deduction`.

## State machine

```
pending ──► processing ──► paid
   │            │
   │            └────────► failed
   ├──────────► paid
   ├──────────► failed
   └──────────► cancelled

failed ──► pending | processing | cancelled
paid / cancelled are terminal
```

Transitions are enforced by `server/modules/payout/domain/payout-rules.js`.

## Stripe failure handling

- **Definitive** errors (4xx, invalid destination, capability missing) mark the
  payout `failed` and notify the owner.
- **Unknown/transient** errors (network, timeout, 5xx) leave the payout in
  `processing` with `failure_code`/`failure_message`. The recovery job replays
  the transfer using the same idempotency key (`payout-<payout_id>`), so it
  either finds the original transfer or creates it exactly once.
- Transfer webhooks (`transfer.created`, `transfer.updated`,
  `transfer.reversed`) reconcile the local row even when the API response was
  lost.

## Ledger

`recordPayoutPaid` posts balanced entries:

| Account | Direction | Amount |
|---|---|---|
| `hotel_owner_payable` (hotel) | debit | payout amount |
| `platform_cash` | credit | payout amount |

The entry group key is `payout_paid:<payout_id>`, making the posting
idempotent. Pending/processing payouts remain reserved against the hotel
balance until they settle, so a second payout cannot spend the same funds.
Refunds after a payout create an owner debt (negative payable) that future
payouts automatically offset.

## API

Mounted at `/api/v1/admin/payouts` (owner/admin BFF):

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List payouts (hotel-scoped for owners) |
| GET | `/settings` | Automation/hold configuration |
| GET | `/hotels/:hotelId/summary` | Totals by status + readiness |
| POST | `/eligible` | Generate payouts (hotel-scoped for owners) |
| GET | `/:payoutId` | Payout + items |
| POST | `/:payoutId/process` | Create the Stripe transfer |
| PATCH | `/:payoutId/status` | Manual status override |
| GET | `/connected-accounts` | List Connect accounts |
| GET | `/connected-accounts/check` | Payout readiness |
| POST | `/connected-accounts` | Create a Connect account |
| POST | `/connected-accounts/:id/link` | Stripe hosted onboarding link |
| POST | `/connected-accounts/:id/sync` | Pull latest Stripe status |

Hotel-scoped callers cannot read or mutate another hotel's payout/account;
`ownerId` filters are validated against hotel ownership.

## Scheduled automation

Jobs live in `server/modules/payout/jobs/payouts.js` and are started by
`server/workers/index.js`.

| Queue | Cadence | Work |
|---|---|---|
| `payoutGeneration` | `PAYOUT_GENERATION_INTERVAL_MS` (daily) | Generate pending payouts |
| `payoutProcessing` | event-driven | Process one payout |
| `payoutRecovery` | `PAYOUT_PROCESSING_INTERVAL_MS` (5 min) | Recover stale `processing`, drain pending when auto-process is on |

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PAYOUT_AUTO_GENERATE` | `false` | Schedule the generation job |
| `PAYOUT_AUTO_PROCESS` | `false` | Automatically enqueue/process payouts |
| `PAYOUT_GENERATION_INTERVAL_MS` | `86400000` | Generation cadence |
| `PAYOUT_PROCESSING_INTERVAL_MS` | `300000` | Recovery cadence |
| `PAYOUT_HOLD_DAYS` | `7` | Days after checkout before payout |
| `PAYOUT_MIN_AMOUNT` | `0` | Skip groups below this net amount |
| `PAYOUT_STALE_MINUTES` | `60` | Age before a `processing` payout is recovered |
| `PAYOUT_BATCH_SIZE` | `500` | Bookings scanned per generation run |
| `PAYOUT_RECOVERY_BATCH_SIZE` | `50` | Payouts scanned per recovery run |

Keep both automation flags **off** until Stripe test-mode verification passes.
The manual `/eligible` + `/:payoutId/process` endpoints continue to work when
automation is disabled.

## Runbook

1. Enable `PAYOUT_AUTO_GENERATE` in staging; run one cycle; verify payout rows,
   items, ledger entries, and reserved balances.
2. Enable `PAYOUT_AUTO_PROCESS` for one hotel/owner and confirm the transfer,
   `transfer.created` reconciliation, and owner notification.
3. Enable globally and watch failed/stale counts.
4. Rollback: set both flags to `false`. Pending payouts can be cancelled through
   `PATCH /:payoutId/status`; no destructive migration is required.

## Tests

- `server/__tests__/unit/modules/payout/application/payout.service.test.js`
- `server/__tests__/unit/modules/payout/application/payout-settings.test.js`
- `server/__tests__/unit/modules/payout/application/connected-account-scope.test.js`
- `server/__tests__/unit/modules/payout/application/settleTransfer.test.js`
- `server/__tests__/unit/modules/payout/application/reconcileTransfer.test.js`
- `server/__tests__/unit/modules/payout/application/connectedAccountSync.test.js`
- `server/__tests__/unit/modules/payout/domain/payout-rules.test.js`
