# Cancellation and refunds: local stack test plan

Issue: [#137](https://github.com/bk-leducphuong/TravelNest-Hotel_Booking_System/issues/137). Implementation: [workflow and business rules](../features/cancellation-refunds.md).

**Status: not executed as part of creating this plan.** Record fresh results below; existing automated results are not evidence that the real local Stripe flow passed. Run commands from the repository root unless stated otherwise.

The central invariant is: cancelling releases the reservation once, while any money owed remains a durable obligation until resolved. A successful cancellation response does not mean the bank has returned the money.

## 1. Test scope and order

| Stage                                   | What it proves                                                            | Suggested time                       |
| --------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------ |
| A. Setup and fixtures                   | Correct local services, authentication, sandbox, and migration            | 15–30 minutes                        |
| B. Smoke: L01–L04                       | Paid cancellation, durable queue, recovery, and duplicate protection      | 20–30 minutes                        |
| C. Business cases: L05–L12              | Policy, review, permissions, admin operations, and UI                     | 45–90 minutes, depending on fixtures |
| D. Automated fault cases and accounting | Database rollback, races, uncertain provider outcomes, ledger, owner debt | Depends on Docker and test runtime   |

Use two complementary environments:

- **Local application + Stripe sandbox:** proves real checkout, signed webhooks, worker execution, and guest/admin behavior.
- **Isolated automated tests:** use real MySQL transactions with a stubbed payment provider to reproduce failures deterministically. These do not prove Stripe connectivity. Mocked browser tests do not prove the full local stack either.

## 2. Prerequisites and local topology

Use Node and Yarn versions declared in the root `package.json`, Docker Compose, Stripe CLI, `curl`, `jq`, and the native MySQL CLI. Install dependencies with `yarn install` if needed.

| Component            | Local address / check                                              |
| -------------------- | ------------------------------------------------------------------ |
| API                  | `http://localhost:3000`                                            |
| Guest app            | `http://localhost:5174` in this plan                               |
| Admin app            | `http://localhost:8000`                                            |
| Worker health        | `http://localhost:4001/health` when running on the host            |
| MySQL                | Actual Compose mapping is `3306:3306`; verify environment settings |
| Redis / MongoDB      | `6379` / `27017`                                                   |
| MinIO API / console  | `9000` / `9001`                                                    |
| Keycloak             | `8080`                                                             |
| NATS / monitoring    | `4222` / `8222`                                                    |
| Mailpit SMTP / inbox | `1025` / `http://localhost:8025`                                   |

Check port conflicts before starting services. Do not terminate unrelated applications. Some older infrastructure instructions say MySQL uses 3307; the checked-in Compose file currently publishes 3306. Match the running service and local environment rather than assuming either port.

Privately verify `server/.env.development` points to local dependencies, including host-reachable MySQL/Redis addresses and `NATS_URL=nats://localhost:4222`. NATS is required by the worker. Do not copy environment files or tokens into test evidence.

For guest port 5174, configure `CLIENT_HOST=http://localhost:5174` for the API and allow the same origin/redirect URI in local Keycloak. Configure the guest's existing Keycloak variables for the local realm. The admin API variable is `NUXT_PUBLIC_API_BASE`, not `NITRO_PUBLIC_API_BASE`.

Use Stripe **sandbox/test keys**, with the browser publishable key and server secret key belonging to the same sandbox as the CLI. Stripe documents test payments and the `4242 4242 4242 4242` card with a future expiry and three-digit CVC in its [testing guide](https://docs.stripe.com/testing). Never use live mode for these tests.

## 3. Start the stack

These steps change the local database and create sandbox financial records. Confirm the selected database is local development before migrating. Preserve existing development data; do not run reset/clear scripts or `docker compose down -v`.

```bash
docker compose --env-file server/.env.development \
  -f server/infra/docker-compose.yml \
  up -d mysql redis mongodb minio nats mailpit keycloak

make infra-check
make infra-mysql ARGS="-e 'SELECT DATABASE(), @@hostname, @@port;'"
make infra-redis ARGS="PING"
yarn workspace @travelnest/server migrate:status
yarn workspace @travelnest/server migrate
```

Confirm migration `20261104000000-durable-cancellation-refunds.js` is applied. The base stack must already have usable hotel, room, inventory, cancellation-rule, and identity data. If it is empty, prepare a separate disposable database using the project's seeding instructions. Finance seeds contain synthetic provider IDs and are not valid substitutes for real sandbox checkout.

In a separate terminal, start forwarding signed Stripe events:

```bash
stripe listen \
  --events payment_intent.succeeded,payment_intent.payment_failed,refund.created,refund.updated,refund.failed,charge.refunded,charge.refund.updated,transfer.created,transfer.updated,transfer.reversed \
  --forward-to http://localhost:3000/api/v1/webhooks/stripe
```

Privately put the listener's signing secret in the server's configured Stripe webhook-secret variable, then restart the API. The webhook route must retain the raw body. See Stripe's [local webhook testing instructions](https://docs.stripe.com/webhooks). A missing secret or mismatched sandbox invalidates the signed-webhook test.

Start each application in its own terminal:

```bash
CLIENT_HOST=http://localhost:5174 yarn dev:server
```

```bash
VITE_SERVER_HOST=http://localhost:3000 yarn dev:guest --port 5174 --strictPort
```

```bash
NUXT_PUBLIC_API_BASE=http://localhost:3000/api/v1 yarn dev:admin
```

**Leave the refund worker stopped for L01.** Verify there is no existing host worker or Compose `bullmq-worker` consuming the same queues. Do not start both. Start the host worker during L02:

```bash
yarn dev:bullmq-worker
```

```bash
curl --fail --silent --show-error http://localhost:4001/health
```

Health output should include `refundRecovery` and `refundReconciliation`; do not assert an old fixed worker count. The Compose worker does not publish host port 4001.

For notification delivery testing, also start the local notification service and its configured dependencies. Optional Go services are available through the same Compose file (`up -d --build analytics media notification`). Financial correctness must be checked separately from email delivery.

## 4. Prepare fixtures and record IDs

Use an existing local guest A, a different guest B, hotel A's administrator with `payment.refund`, and a user without access to hotel A. Log in through local Keycloak; there is no assumed shared seeded password.

Create **fresh bookings through the guest UI**, with future dates and real sandbox payment. Wait for the payment webhook and verify the transaction is completed, its real Stripe charge exists, and its original payment ledger is present. Do not simulate payment by updating SQL statuses.

| Fixture | Setup and expected policy                                                                     |
| ------- | --------------------------------------------------------------------------------------------- |
| F1      | Paid USD, fully refundable before deadline; separate booking for each destructive case        |
| F2      | Paid USD, cancellation allowed after free deadline; known partial refund percentage           |
| F3      | Paid USD, non-refundable policy                                                               |
| F4      | Mixed rooms with different policies; quantities greater than one if supported                 |
| F5      | Unpaid booking with reserved inventory                                                        |
| F6      | Legacy/missing policy snapshot or missing provider charge; isolated fixture for manual review |
| F7      | Paid transaction with sufficient remaining balance for admin partial refunds                  |

For an easy numerical example, use a controlled $100 gross booking with no extra tax/service fees: 100% means $100 back; 50% means $50 back; 0% means $0 back. For mixed rooms, $200 refundable + $300 non-refundable means $200 back and $300 retained. For other fixtures, calculate from their actual gross amounts and allocated fees. Do not assume all seeded bookings match these numbers.

Record only non-secret evidence: booking UUID/code, hotel/room UUIDs, transaction UUID, refund-record UUID, provider charge/refund/event IDs, quote ID, timestamps, and expected amounts. Save inventory counts per room/night **before** cancellation. Existing bookings may share those nights.

## 5. Manual local acceptance cases

| ID  | Steps                                                                                                                                                | Expected result / evidence                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L01 | Worker off. With F1, open cancellation, inspect and acknowledge quote, then confirm.                                                                 | Quote shows amount, fee, currency, deadline, destination and ETA. Booking becomes cancelled; inventory decreases by this booking's quantities exactly once. Refund obligation and cancellation decision persist atomically. No app-created Stripe refund exists yet.                                                                                                                               |
| L02 | Start worker; refresh guest status and inspect Stripe sandbox. Restart worker once afterward.                                                        | Recovery discovers SQL obligation, normally on its 15-second scan. One provider refund is correlated to the original refund row. Eventually succeeded, with balanced ledger and payment totals. Restart creates no second refund. ETA is a bank arrival estimate, not a local test timeout.                                                                                                        |
| L03 | Repeat cancellation using the original quote ID; also run two concurrent confirmations on a fresh F1.                                                | Duplicate cancellation returns the stored decision (`idempotentReplay` on replay); only one obligation, one inventory release and one cancellation event. Confirm provider count as well as HTTP status.                                                                                                                                                                                           |
| L04 | Fetch quote, wait over five minutes, then confirm. Separately change refundable balance through a valid admin refund after quoting.                  | Expired or financially stale quote returns 409 `CANCELLATION_QUOTE_EXPIRED`; no cancellation side effects. Refresh produces a new quote and requires acknowledgement again. Missing `quoteId` is a validation error.                                                                                                                                                                               |
| L05 | Book under policy A. Change the hotel's current rule using supported admin controls. Cancel the original booking.                                    | Calculation uses the booking's version-2 snapshot, including its original timezone/deadline. New bookings use the new rule. Check both sides of the deadline using suitable future fixtures; do not change the machine clock.                                                                                                                                                                      |
| L06 | Cancel F2, F3 and F4 separately. Include tax/service-fee and rounding examples.                                                                      | Partial/full/zero refunds match each snapshot; mixed-room gross allocations sum correctly, with no extra cent. No-refund cancellation creates no executable refund. All reserved room quantities are released once.                                                                                                                                                                                |
| L07 | Cancel F5.                                                                                                                                           | Booking cancels and inventory releases; no money is refunded because nothing was captured.                                                                                                                                                                                                                                                                                                         |
| L08 | Cancel F6. Inspect guest and admin screens; leave worker running.                                                                                    | Cancellation succeeds, guest amount/fee remain undecided rather than displayed as $0, and a non-executable manual-review row appears. Worker does not send it to Stripe. Use separate review fixtures to approve a positive amount and reject with amount 0; require a meaningful reason. Positive approval queues the reviewed amount; rejection records the decision without provider execution. |
| L09 | Admin requests a partial refund on F7, repeats the same request/key, then submits concurrent requests whose sum exceeds the remaining balance.       | New request is queued (201), not blocked on provider latency. Same actor/key/payload does not create another operation. Missing key is rejected; changed payload with the same key conflicts. Concurrent requests cannot overcommit the captured balance. Guest tracking remains consistent with any cancellation entitlement.                                                                     |
| L10 | Try quote, cancel and tracking as guest B; try admin actions without a token, without refund permission, and for an inaccessible hotel.              | Unauthorized requests are denied without returning another buyer's data or changing financial/inventory records. No token gives 401; ownership/permission checks give the route's 403/404 response. Authorized hotel A admin requests include `X-Hotel-Id`.                                                                                                                                        |
| L11 | Admin force-cancels a paid booking with refund switch off, then another with explicit refund on.                                                     | Default does not silently request money. Explicit refund queues the allowed override; with no amount supplied it requests remaining captured funds. Check audit actor and reason. This differs intentionally from guest cancellation, which automatically queues eligible money.                                                                                                                   |
| L12 | Repeat guest cancellation/tracking and admin review in English/Vietnamese, desktop/mobile; navigate by keyboard. Refresh and reopen booking history. | Amounts, statuses, error messages and ETA are translated; loading/error/retry states work; acknowledgement and confirmation are accessible. Booking history refreshes status. Notifications, if enabled, correspond to committed outcomes and do not announce a stale success after failure.                                                                                                       |

For L08, use an existing known legacy test record or a dedicated isolated fixture. Do not erase the snapshot/charge from a real paid booking merely to make the case pass.

### Reproducible guest API smoke

Use an interactive **Bash** shell. Copy the guest's local bearer token from your own browser session into the hidden prompt; do not paste it into command history or evidence. Set `TN_BOOKING_ID` to a fresh F1 booking UUID. These calls perform a real local cancellation.

```bash
export TN_API=http://localhost:3000/api/v1
read -r -p 'Booking UUID: ' TN_BOOKING_ID
read -r -s -p 'Guest bearer token: ' TN_GUEST_TOKEN
printf '\n'
umask 077
TN_RESULTS="$(mktemp -d /tmp/travelnest-refunds.XXXXXX)"

curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $TN_GUEST_TOKEN" \
  "$TN_API/bookings/$TN_BOOKING_ID/cancellation-quote" \
  -o "$TN_RESULTS/quote.json"
jq '.data' "$TN_RESULTS/quote.json"
TN_QUOTE_ID="$(jq -er '.data.quoteId' "$TN_RESULTS/quote.json")"
jq -n --arg quoteId "$TN_QUOTE_ID" '{quoteId:$quoteId}' \
  > "$TN_RESULTS/cancel-request.json"

curl --fail-with-body --silent --show-error -X DELETE \
  -H "Authorization: Bearer $TN_GUEST_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary "@$TN_RESULTS/cancel-request.json" \
  "$TN_API/bookings/$TN_BOOKING_ID" -o "$TN_RESULTS/cancel.json"
jq '.data' "$TN_RESULTS/cancel.json"

curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $TN_GUEST_TOKEN" \
  "$TN_API/bookings/$TN_BOOKING_ID/refund" \
  -o "$TN_RESULTS/tracking.json"
jq '.data' "$TN_RESULTS/tracking.json"
```

For L03 repeat the DELETE with the same saved request. For L04 inspect the HTTP status and error body; `--fail-with-body` intentionally exits nonzero on a rejected request. Do not continue dependent steps after a failed quote. No token or signing secret belongs in a saved response/report.

Admin API contracts for manual checks:

| Action                        | Request                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New refund                    | `POST /api/v1/admin/payments/transactions/:transactionId/refunds`, `Idempotency-Key` header (1–200 chars), JSON `{"amount":50,"reason":"customer_request"}`; **amount is major currency units**, so this means $50 |
| Resolve review                | `POST /api/v1/admin/payments/refunds/:refundId/review`, JSON `{"amount":50,"reason":"Approved after checking original policy"}`; use a fresh fixture for rejection with amount 0                                   |
| Reconcile uncertain operation | `POST /api/v1/admin/payments/refunds/:refundId/retry`; use only an eligible uncertain operation, not a confirmed provider failure                                                                                  |
| Force cancellation            | `POST /api/v1/admin/bookings/:bookingId/cancel`; follow the current admin validator/UI for reason and explicit `processRefund`                                                                                     |

All admin calls need a valid admin bearer token and `X-Hotel-Id`. These API amounts and database monetary columns use major units ($50.00). The Stripe adapter converts to provider minor units; do not submit 5000 to this API when you intend a $50 refund.

### Signed webhook negative check

With signature verification configured, this unsigned payload must return HTTP 400 and leave refunds/inbox unchanged:

```bash
curl --silent --show-error -w '\nHTTP %{http_code}\n' \
  -H 'Content-Type: application/json' \
  --data '{"id":"evt_local_invalid","type":"refund.updated","data":{"object":{}}}' \
  http://localhost:3000/api/v1/webhooks/stripe
```

`stripe trigger` creates synthetic objects without the booking's correlation metadata; it is not proof that a booking refund works. Exact signed-event replay/reclaim is covered by the isolated tests below. Stripe CLI `events resend` targets a registered webhook endpoint ID, not the local forwarding URL.

## 6. Database evidence (read-only checks)

Open the configured local database with `make infra-mysql`. Replace the placeholder with your fixture's UUID. `SET` below changes only the SQL session variable. Never include bearer tokens or complete Stripe event payloads in evidence.

```sql
SET @booking_id = 'REPLACE_WITH_BOOKING_UUID';

SELECT id, status, cancellation_policy_snapshot,
       cancellation_quote, cancellation_decision
FROM bookings WHERE id = @booking_id;

SELECT id, booking_id, transaction_type, amount, currency, status,
       stripe_charge_id
FROM transactions WHERE booking_id = @booking_id;

SELECT id, transaction_id, amount, currency, eligibility, status,
       workflow_state, idempotency_key, provider_refund_id,
       attempt_count, first_attempt_at, next_retry_at, lease_until,
       failure_code, failure_message
FROM refunds WHERE booking_id = @booking_id ORDER BY requested_at;

SELECT ri.room_id, ri.date, ri.booked_rooms, ri.total_rooms
FROM room_inventory ri
JOIN booking_rooms br ON br.room_id = ri.room_id
JOIN bookings b ON b.id = br.booking_id
WHERE b.id = @booking_id
  AND ri.date >= b.check_in_date AND ri.date < b.check_out_date
ORDER BY ri.room_id, ri.date;

SELECT entry_group_key, currency,
       SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS debits,
       SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS credits
FROM ledger_entries WHERE booking_id = @booking_id
GROUP BY entry_group_key, currency;

SELECT event_key, event_type, created_at, delivered_at
FROM payment_outbox
WHERE event_key = CONCAT('booking-cancelled-', @booking_id)
   OR event_key LIKE CONCAT('%', @booking_id, '%');
```

Check additional refund outbox events by their specific refund UUID/event key, since not every key contains the booking UUID. Inspect relevant webhook inbox rows by exact recorded event IDs using `webhook_event_logs`; select only IDs/type/status/error/timestamps, not the complete payload.

Acceptance checks:

- Inventory drops by this booking's quantity on each night; it need not reach zero. Replay leaves counts unchanged.
- One cancellation decision and one executable obligation exist for one guest cancellation. Separate reviewed replacement operations are legitimate and retain their own history.
- Each ledger group balances by currency. Compare amounts and account directions too: a balanced but incorrectly allocated group still fails.
- For a controlled $100 payment with original $10 commission, a $100 refund reverses $90 hotel payable and $10 platform revenue against $100 cash. A $50 refund reverses $45/$5/$50. Today's commission configuration must not change those historical allocations.
- Pending/unknown/manual-review obligations remain reserved against owner payout availability. A confirmed provider failure does not erase the approved cancellation entitlement.
- Compare provider IDs, amounts, successful-refund totals and app tracking to the Stripe sandbox. HTTP 200 alone is insufficient.

## 7. Automated verification and fault recovery

Run these independently of the manual stack. The integration configuration creates disposable Testcontainers; it must not be redirected to a shared development or production database. Docker must be available. Test provider IDs in that suite are synthetic.

```bash
yarn workspace @travelnest/server test:unit --runInBand --forceExit
yarn workspace @travelnest/server test:integration --runInBand --forceExit \
  --runTestsByPath __tests__/integration/cancellation-refunds.test.js
yarn workspace @travelnest/client test:unit
yarn workspace @travelnest/client test:component
yarn workspace @travelnest/admin-client test:unit
yarn workspace @travelnest/admin-client typecheck
PLAYWRIGHT_PORT=5174 yarn workspace @travelnest/client test:e2e \
  tests/e2e/guest-redesign.spec.js --grep 'refund quote|checkout edits reach payment'
yarn workspace @travelnest/server lint --quiet
yarn workspace @travelnest/client lint
yarn workspace @travelnest/admin-client lint
yarn workspace @travelnest/server arch:check
```

Before Playwright, confirm port 5174 is free or belongs to the correct TravelNest app. Its reusable dev server must not point to an unrelated application. These browser cases use mocked API responses; retain L01–L12 as the actual application acceptance checks. `--forceExit` handles existing Jest open handles and does not demonstrate clean process shutdown.

| Fault / invariant                                                               | Where to verify                                                                                           | Expected result                                                                                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Concurrent guest cancellations / concurrent partial refunds                     | [MySQL integration suite](../../server/__tests__/integration/cancellation-refunds.test.js)                | Row locks prevent duplicate release and over-refunding                                                                         |
| Cancellation outbox insert fails                                                | Same integration suite                                                                                    | Decision, obligation, booking status and inventory all roll back                                                               |
| Ledger posting fails, then recovery runs                                        | Same integration suite                                                                                    | No partially committed outcome; recovery posts exactly once                                                                    |
| Provider accepted refund but response was lost; webhook arrives before response | Same integration suite                                                                                    | Metadata/key recover the original operation; no second provider refund                                                         |
| Duplicate worker and failed webhook-inbox reclamation                           | Same integration suite                                                                                    | One operation is claimed; failed receipt can retry; completed receipt deduplicates                                             |
| Legacy review, missing charge, zero rejection replay                            | Same integration suite                                                                                    | Review cannot execute accidentally; repeated decision is stable; changed replay conflicts                                      |
| Provider later returns refund as failed                                         | Same integration suite                                                                                    | Reverse refund ledger once, retain entitlement, prevent stale success revival; replacement must cover outstanding entitlement  |
| Owner already paid before refund                                                | Same integration suite; payout unit suites                                                                | Negative hotel payable represents debt; future credits offset it; payouts cannot bypass reserves                               |
| Unknown outcome, backoff/exhaustion, safe replay window                         | [Refund worker unit suite](../../server/__tests__/unit/modules/payment/application/refund-worker.test.js) | Uncertain funds remain reserved; eight exhausted attempts require attention; after 23 hours do lookup rather than blind create |
| Migration interrupted/repeated and rollback                                     | MySQL integration suite, disposable database only                                                         | Re-running up is safe; do not run migration down on shared development obligations                                             |

For a real recovery demonstration, L01–L02 is the supported manual outage test: stop only your host worker, preserve SQL obligations, then restart it. Do not flush Redis, change the system clock, delete financial rows or block the machine's network to inject failures.

An invalid sandbox key tests authentication failure, not an accepted-but-lost provider response. Do not report it as that scenario. Keep precise lost-response, returned-refund and long-window cases in the deterministic suites unless a dedicated provider fault harness is available.

Check logs for `refund_attention_required`, `Refund reconciliation failed`, and `Refund reconciliation could not locate provider operation`. The daily reconciliation sweep reports `checked`/`drift` and must not create new provider refunds. Its schedule alone does not prove it ran during a short smoke test: retain explicit execution evidence or mark it not run. Log generation is distinct from delivery of a Grafana/email alert; mark alert delivery blocked if no alert integration is configured.

## 8. Exit criteria and run sheet

The smoke passes only when local cancellation, inventory release, durable refund recovery, real signed webhook processing, provider reconciliation and balanced accounting all agree. A successful stub suite cannot substitute for that result.

For feature sign-off, complete all applicable business cases and fault suites. Record missing fixtures/integrations as **blocked**, not passed. Notification delivery and external alerting require their own configured services. Record the full-stack cases separately from automated results.

| Check                                                  | Result                              | Evidence / defect                                                                                                                                                                                                                      |
| ------------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commit/branch, date, tester, local service versions    | Pass                                | `codex/137-durable-cancellation-refunds`, HEAD `430758a` + 76 uncommitted feature files; 2026-11-04→05; Node 24.14.1, Yarn 4.13.0, Stripe CLI 1.53.1, Compose 5.6.1, MySQL 8.0.46, Redis 7.4.9, Keycloak 26.0                          |
| Migration and local dependency health                  | Pass                                | `20261104000000-durable-cancellation-refunds` applied; MySQL/Redis/MinIO healthy; `make infra-check` equivalent verified via `/health` (analytics service down but optional)                                                           |
| L01–L04: real sandbox smoke / duplicate protection     | Pass                                | L01 queued obligation, no provider refund; L02 one correlated refund + restart replay; L03 one side effect, concurrent replay; L04 expired + financially stale quotes both 409 with no side effects                                    |
| L05–L08: policy, multi-room, unpaid, manual review     | Pass (tax/fee examples **blocked**) | Snapshot honoured after rule change; 50%/0%/mixed splits exact; unpaid no refund; manual review null amounts, approve/reject tested; local data has 0 tax/service-fee rates                                                            |
| L09–L11: admin, idempotency, permissions, overrides    | Pass                                | 201 queueing, same-key replay, changed-payload 409, missing key 400, 3×$100 accepted + 4th rejected at $73.79; 401/403/404 matrix; force-cancel default vs override                                                                    |
| L12: English/Vietnamese, mobile, accessibility         | Pass with defect                    | VI/EN amounts, statuses, ETA and admin review verified at 1280px/1440px and 390px (0 overflow); keyboard order reaches skip link, acknowledgement checkbox and buttons. **Defect:** cancelled bookings are never listed in `/bookings` |
| Provider IDs / webhook receipts / balanced ledger      | Pass                                | Real `ch_`/`re_` IDs correlated to refund rows; 15 succeeded refunds totalling $3,780.47; every ledger group balances; outbox 51/51 delivered; unsigned webhook 400 with unchanged refunds/inbox                                       |
| Backend unit and disposable MySQL integration          | Pass                                | 125 suites / 703 unit tests; 19/19 Testcontainers integration tests (MySQL/Redis/Mongo)                                                                                                                                                |
| Guest/admin tests, typecheck, lint, architecture       | Pass                                | Client unit 27/27, component 83/83, mocked E2E 5/5 (EN/VI × 1440/375); admin unit 49/49, typecheck clean; all three lints 0 errors; `arch:check` passed                                                                                |
| Long-window recovery, owner debt, daily reconciliation | Partial                             | Covered by integration/unit suites; daily sweep did not execute during the smoke window — mark the scheduled run **not run**                                                                                                           |
| Notifications / configured external alerts             | Blocked                             | Notification service not running (`GET /api/v1/notifications` 502); no Grafana/email alert integration configured                                                                                                                      |

For a failure, record case ID, fixture IDs, expected vs actual amount/state, timestamp, HTTP status/error code, sanitized log excerpt and whether replay changes the result. Do not attach JWTs, signing secrets, Stripe client secrets or full environment files.

After testing, stop only the processes you started and unset shell token variables (`unset TN_GUEST_TOKEN`). Keep fixture records identifiable for investigation; clean only explicitly disposable resources. Do not undo the migration or remove pending obligations as routine cleanup.

## 9. Local run record — 2026-11-04/05

Every manual case below used real Stripe sandbox objects (`acct_1T4DQCC8yETwFKHF`, test mode) and signed webhooks forwarded by `stripe listen` to the raw-body route. HTTP success was cross-checked against provider state, refund rows, inventory and the ledger.

### Environment deviations (local only)

- **Keycloak ran on `http://localhost:18080`.** Host port 8080 is held by an unrelated SessionUp document-export worker, which was not terminated. The API ran with `KEYCLOAK_BASE_URL`/`KEYCLOAK_ISSUER` pointed at 18080, and the guest/admin apps with matching `VITE_KEYCLOAK_URL`/`NUXT_PUBLIC_KEYCLOAK_URL`.
- The local `travelnest-web` client gained `http://localhost:5174/*` in redirect URIs and web origins, plus direct access grants enabled for API scripting. These are local realm changes only.
- Four throwaway identities were created: `tn.guest.a@travelnest.local`, `tn.guest.b@travelnest.local`, `tn.noaccess@travelnest.local`, `tn.hotel.admin@travelnest.local`. The last was given the `owner` role on hotel A through one `hotel_users` row; no existing identity or membership was modified.
- Hotel A: **The Manor** `01a197e4-f4c0-7040-a865-4e4cfc9d6dec`; hotel-wide rule 48 h / 100 % before / 50 % after; rooms `Double 987` (`…4c761fa16e35`) and `Double 845` (`…4c77f4718410`).
- Hotel B (non-refundable): **Sunset Place** `01a197e4-f469-77b5-a03b-565528f63546`, `Deluxe 812` (`…f7e7-7772-9a5f-17b3d0b4f2b0`).
- F6 rows are **dedicated isolated fixtures**: paid bookings whose `cancellation_policy_snapshot` was set to NULL only to simulate legacy data. No normal paid booking was altered.
- F4 used a temporary room-specific zero-refund rule on `Double 845`, created and deleted through the admin API during the run.

### Fixtures and outcomes

| Fixture                    | Booking code       | Gross   | Expected                      | Actual                                                               |
| -------------------------- | ------------------ | ------- | ----------------------------- | -------------------------------------------------------------------- |
| F1                         | `BKMW25IFDYC7D47F` | $582.99 | 100 % → $582.99               | succeeded `re_3UY4DkC8yETwFKHF1zU7gNa0`                              |
| F1b (concurrent)           | `BKMW25M3BB3FBDC0` | $533.21 | one refund                    | succeeded `re_3UY4GQC8yETwFKHF1u0Q2lvg`                              |
| F1c (UI cancel)            | `BKMW25N3YB8BBF58` | $455.41 | 100 %                         | succeeded `re_3UY4HBC8yETwFKHF09jYLhrD`                              |
| F1d (admin partials)       | `BKMW25N5YK81C704` | $423.79 | ≤ captured                    | 50 + 100 + 100 + 100 = $350, $73.79 remaining                        |
| F2 (after deadline)        | `BKMW25Q69EEB43A2` | $288.65 | 50 %                          | refund $144.33, fee $144.32                                          |
| F3 (non-refundable)        | `BKMW25QJTZF88426` | $368.11 | $0, no obligation             | no refund row, `no_refund`                                           |
| F4 (mixed rooms)           | `BKMW25U70BB82ABE` | $828.66 | refundable gross only         | refund $376.82, fee $451.84                                          |
| F5/F7-unpaid               | `BKMW25QW8E64E37B` | $162.59 | no money moved                | no transaction, no refund row                                        |
| L05a (pre-change snapshot) | `BKMW25RANUFF38E9` | $434.17 | 48 h/100 % snapshot           | $434.17                                                              |
| L05b (new rule)            | `BKMW25RVZS492BB0` | $478.09 | 72 h/80/20 → 20 %             | $95.62, fee $382.47                                                  |
| F6a (review approve)       | `BKMW25VU0U4B0B94` | $506.84 | manual review → approved $100 | review row cancelled, replacement $100 `re_3UY4NkC8yETwFKHF2t28Jo8X` |
| F6b (review reject)        | `BKMW25VW1I564680` | $438.24 | rejected 0                    | `review_resolved`, no provider refund                                |
| F6c (review via UI)        | `BKMW2EOCLIAB4240` | $569.28 | approved $120                 | `re_3UY8DwC8yETwFKHF2g1ycQIB`                                        |
| L11a (force, no refund)    | `BKMW25V2ML2E5969` | $265.00 | no refund row                 | confirmed                                                            |
| L11b (force, refund)       | `BKMW25V4MWFB16BA` | $299.27 | full captured                 | $299.27                                                              |
| L11c (override past 50 %)  | `BKMW25VG6XF457ED` | $288.65 | full captured, not $144.33    | $288.65                                                              |

### Case results

- **L01 pass.** Worker stopped, no listener job consumed. Quote returned $582.99, fee $0, currency USD, deadline `2026-11-08T19:00:00Z`, destination `original_payment_method`, ETA 5–10 business days. Cancellation stored the decision (`refund_required`), released both nights from `booked_rooms=1` to `0`, queued `booking-cancelled-…` and left zero Stripe refunds.
- **L02 pass.** Worker health exposed `refundRecovery` and `refundReconciliation` (5 queues). Recovery executed one refund with `refund_record_id` metadata within ~10 s; ledger groups `payment_succeeded` and `refund_succeeded` each balanced. A worker restart produced no second refund (1 row, 1 provider refund).
- **L03 pass.** Replay with the original quote returned the same refund ID with `idempotentReplay: true`; 1 refund row, 1 cancellation event. Two concurrent confirmations on F1b both returned 200, one replay, one refund ID, one provider refund, inventory released once.
- **L04 pass.** Confirmation after the five-minute window returned `409 CANCELLATION_QUOTE_EXPIRED`. A quote taken before a valid $50 admin refund was also rejected with 409 after the refund; booking stayed confirmed, inventory unchanged, no decision. A refreshed quote showed $50 already committed ($373.79 refundable). Missing `quoteId` returned 400 `VALIDATION_ERROR`.
- **L05 pass.** After patching the hotel rule to 72 h/80 %/20 % through `PATCH /admin/hotels/:hotelId/cancellation-rules/:ruleId`, the older booking still used its 48 h/100 %/50 % snapshot; a booking created afterwards used 72 h/20 %. Rule restored afterwards.
- **L06 pass for percentages, multi-room and rounding (tax/service-fee part blocked).** F2 produced $144.33 + $144.32 = $288.65; mixed rooms produced $376.82 refundable + $451.84 retained = $828.66; L05b produced $95.62 + $382.47 = $478.09. No local hotel has non-zero tax/service-fee rates, so proportional tax/fee allocation was only covered by the disposable suites.
- **L07 pass.** Unpaid cancellation released inventory, created no refund row and moved no money.
- **L08 pass.** Missing snapshot produced a quote with null refund and fee (`manual_review`, `missing_policy_snapshot`), a zero-amount non-executable review row, and no Stripe call over 20 s. Approving $100 queued a separate replacement operation that succeeded; a second fixture rejected with amount 0 became `review_resolved` with no provider refund. Missing reason returned 400.
- **L09 pass.** New refund returned 201/queued. Same actor/key/payload returned the same operation; changed payload returned `409 IDEMPOTENCY_KEY_REUSED`; missing key returned `400 INVALID_IDEMPOTENCY_KEY`. Four concurrent $100 requests against $373.79 remaining accepted three and rejected the fourth with `REFUND_EXCEEDS_REMAINING` ($73.79). Guest tracking agreed with the committed total.
- **L10 pass.** Guest B received 404 for another buyer's quote, tracking and cancellation; no-token calls returned 401; a guest token without hotel membership and a hotel admin using a foreign `X-Hotel-Id` both returned 403 `HOTEL_ACCESS_DENIED`. Authorized calls worked with `X-Hotel-Id`; omitting it returned 403 `HOTEL_CONTEXT_REQUIRED`.
- **L11 pass.** Force-cancel without the switch created no refund. With `processRefund: true` and no amount, a booking whose guest quote was $144.33 was refunded the full $288.65. Actor and reason appeared in the decision; no money was requested silently by default.
- **L12 pass with one defect.** Headless Chromium verified Vietnamese and English amounts, statuses, ETA ("5–10 ngày làm việc"), policy text, admin refund headers/statuses and the review dialog at 1280/1440 px and 390 px (0 horizontal overflow). Keyboard order: skip link → main nav → acknowledgement checkbox → keep-booking link. The acknowledgement checkbox gates the submit button. A cancellation completed through the guest UI produced a real refund. **Defect:** `/bookings` always calls `getBookings(false, …)`, so cancelled bookings disappear from booking history; only a direct link can reopen them. This weakens the "reopen booking history to refresh refund status" expectation in L12 and the workflow document.

### Automated results

| Command                                                                                                                | Result                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `yarn workspace @travelnest/server test:unit --runInBand --forceExit`                                                  | 125 suites / 703 tests passed                               |
| `… test:integration --runInBand --forceExit --runTestsByPath __tests__/integration/cancellation-refunds.test.js`       | 19/19 passed on disposable Testcontainers MySQL/Redis/Mongo |
| `yarn workspace @travelnest/client test:unit`                                                                          | 27/27 passed                                                |
| `yarn workspace @travelnest/client test:component`                                                                     | 83/83 passed                                                |
| `PLAYWRIGHT_PORT=5174 … test:e2e tests/e2e/guest-redesign.spec.js --grep 'refund quote\|checkout edits reach payment'` | 5/5 passed (EN/VI × 1440/375, mocked API)                   |
| `yarn workspace @travelnest/admin-client test:unit`                                                                    | 49/49 passed                                                |
| `yarn workspace @travelnest/admin-client typecheck`                                                                    | passed                                                      |
| `server lint --quiet`, `client lint`, `admin-client lint`                                                              | 0 errors (client warnings only)                             |
| `yarn workspace @travelnest/server arch:check`                                                                         | passed                                                      |

### Accounting and operations evidence

- 15 succeeded refunds totalling **$3,780.47**, all with provider `re_…` IDs stored on the refund row and Stripe metadata pointing back to `refund_record_id`.
- `payment_outbox`: 51 rows, **0 undelivered**. No `refund_attention_required`, `Refund reconciliation failed` or "could not locate provider operation" entries in the worker logs.
- The unsigned webhook negative check returned **HTTP 400 Invalid signature** and left refund/inbox counts unchanged (6/28 before and after).
- The daily reconciliation sweep is scheduled, not driven by the smoke test; no `checked`/`drift` execution line was produced during this window, so the scheduled run is **not run**, not passed. Alert delivery remains **blocked** (no configured alert integration); notification delivery is **blocked** because the local notification service was not running (`GET /api/v1/notifications` → 502).

### Follow-ups

1. Fix booking history to include cancelled bookings (e.g. expose `includeCancelled`/a cancelled filter) so guests can reopen refund tracking, as the workflow document promises.
2. Configure a local hotel with non-zero tax/service fees to exercise proportional allocation through a real booking; today only automated suites cover it.
3. Alert integration is still required to prove `refund_attention_required` and reconciliation drift reach an operator.
