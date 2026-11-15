# Load testing runbook

Everything needed to generate load against TravelNest, read the result, and work
out whether a number is a real regression or noise. Companion to
[`README.md`](./README.md), which covers the suite's design.

- [1. How this works](#1-how-this-works)
- [2. Prerequisites](#2-prerequisites)
- [3. The rate-limiter exemption](#3-the-rate-limiter-exemption)
- [4. Choosing where to run](#4-choosing-where-to-run)
- [5. The suites](#5-the-suites)
- [6. Reading the k6 summary](#6-reading-the-k6-summary)
- [7. Reading the dashboards](#7-reading-the-dashboards)
- [8. The four signals](#8-the-four-signals)
- [9. PromQL cookbook](#9-promql-cookbook)
- [10. Alerts](#10-alerts)
- [11. What normal looks like](#11-what-normal-looks-like)
- [12. Troubleshooting](#12-troubleshooting)
- [13. Cost and cleanup](#13-cost-and-cleanup)

---

## 1. How this works

```
k6 (generator)  ──HTTP──▶  Cloudflare ──▶ tunnel ──▶ Traefik ──▶ API pod ──▶ MySQL / Redis
                                                                    │
                                                     prom-client ────┘
                                                            │ scrape :9464 every 60s
                                                            ▼
                                                          Alloy ──▶ Grafana Cloud
```

The single most important distinction in this document:

|                 | Measured where                 | Includes                                           | Used for                       |
| --------------- | ------------------------------ | -------------------------------------------------- | ------------------------------ |
| **Server-side** | Inside Express (`prom-client`) | Handler + DB/Redis time only                       | Dashboards, alerts, thresholds |
| **Client-side** | k6                             | DNS + TLS + Cloudflare + tunnel + network + server | The guest's experience         |

They are different numbers for the same request and both are real. A search that
takes 750 ms server-side showed 1,046 ms from a Helsinki generator and 1,600 ms
from a laptop in Vietnam. When you read a p95, always ask which one it is.

Consequences worth internalising:

- **Thresholds come from server-side numbers.** The dashboards and the alerting
  rules never see Cloudflare or your ISP, so a laptop run is still valid for
  checking whether a panel works and whether a change regressed the server.
- **Sample size is the whole game.** `histogram_quantile` on seven samples is
  one request wearing a percentile costume. The API gets roughly one request
  every 40 seconds when idle, so percentiles there are meaningless; that is why
  the tests run for ten minutes at double-digit request rates.
- **Rate windows matter.** Metrics are scraped every 60 s. A 5-minute `rate()`
  needs ~5 minutes of load to fill, a 1-hour panel needs an hour. A 90-second
  test produces a spike, not a curve.

## 2. Prerequisites

| Need                  | Why                                                 | Check                                      |
| --------------------- | --------------------------------------------------- | ------------------------------------------ |
| Docker                | k6 runs from `grafana/k6:2.4.0`, nothing to install | `docker version`                           |
| The bypass token      | Otherwise you are capped at 300 requests / 15 min   | [section 3](#3-the-rate-limiter-exemption) |
| `hcloud` + an SSH key | Only for the ephemeral Hetzner runner               | `hcloud server list`                       |
| `gcx`                 | Only for querying Grafana from the CLI              | `gcx api /api/health`                      |

The k6 image is pulled on first use (~100 MB).

## 3. The rate-limiter exemption

The API allows **300 requests / 15 min per client** and **60 writes / 15 min**
(`RATE_LIMIT_MAX`, `RATE_LIMIT_WRITE_MAX`). A ramp issues thousands, so it will
be throttled unless it is exempt.

Two mechanisms exist; the token is the one to use. **You do not set it by
hand**: `run.sh` reads `RATE_LIMIT_BYPASS_TOKEN` from `deploy/k8s/.env.prod` and
runs the preflight for you. The manual equivalent, if you need it:

```bash
export BYPASS_TOKEN=$(sed -n 's/^RATE_LIMIT_BYPASS_TOKEN=//p' deploy/k8s/.env.prod)

# proof it is applied: no output means exempt
curl -s -D - -o /dev/null -H "X-Load-Test-Token: $BYPASS_TOKEN" \
  https://api.trestay.com/api/v1/search/destinations/trending?limit=4 | grep -i ratelimit
```

- Value lives in the `api-secret` (SOPS-encrypted) and your local
  `deploy/k8s/.env.prod`; never commit it.
- The API compares it in constant time and **only** exempts the global and write
  limiters. The auth limiter is untouched.
- Read it from the file as above rather than pasting it, so it stays out of shell
  history.

### IP allowlist (for long-lived machines)

`RATE_LIMIT_ALLOWLIST` in the API ConfigMap takes addresses and CIDR subnets.
Skip it for ephemeral machines: their address changes every run, and a stale
entry for a recycled IP is a standing bypass.

If you do use it, list **both families** — a machine preferring IPv6 needs its
v6 address or `/64`, otherwise an IPv4-only entry silently does nothing. That
trap cost one debugging session already.

## 4. Running a test

One command. `scripts/run.sh` resolves the target, the bypass token and (for the
funnel) a guest token, then runs k6 in Docker.

| Command                    | What it does                                             |
| -------------------------- | -------------------------------------------------------- |
| `make loadtest`            | read path → prod, 12 peak VUs, ~10m30s                   |
| `make loadtest-local`      | read path → `http://localhost:3000`                      |
| `make loadtest-smoke`      | read path, 2 VUs for 20 s — plumbing check               |
| `make loadtest-funnel`     | booking funnel → prod, no payment                        |
| `make loadtest-funnel-pay` | funnel + Stripe test payment (real confirmation metrics) |
| `make loadtest-remote`     | read path from an ephemeral Hetzner VM                   |
| `make loadtest-cleanup`    | delete the rows the runs created (prod)                  |

Anything else is a flag on `run.sh`:

```bash
./loadtest/scripts/run.sh --vus 25
./loadtest/scripts/run.sh --funnel --duration 10m
./loadtest/scripts/run.sh --local --smoke
./loadtest/scripts/run.sh --funnel --pay --no-preflight
```

### One-time setup

```bash
cp loadtest/.env.example loadtest/.env     # gitignored
$EDITOR loadtest/.env                      # LOADTEST_PASSWORD is the only value you must fill
```

`BYPASS_TOKEN` and `STRIPE_SECRET_KEY` are read from `deploy/k8s/.env.prod`
automatically. `loadtest/.env` only needs to override them if you are on a
machine without that file.

The preflight runs before every prod test and refuses to start if the target is
still throttling you — better than discovering it 300 requests in.

The script mints a fresh guest token for funnel runs (30-minute lifespan), so
there is nothing to copy around.

### Choosing a target

| Target             | Measures                      | Watch out for                                                    |
| ------------------ | ----------------------------- | ---------------------------------------------------------------- |
| `--local`          | your machine                  | never reaches Grafana; server-side numbers still land on `:9464` |
| `--prod` (default) | the deployment                | your link caps throughput (~8–12 rps) and inflates the k6 p95    |
| `--remote`         | the deployment, from Helsinki | ~€0.01 per run, ~2 min setup, deleted on exit                    |

Use the laptop for iterating and checking panels; `--remote` for numbers you
intend to quote.

### What `--remote` does

Create `cx23` in `hel1` from [`cloud-init.yaml`](./cloud-init.yaml) → wait for SSH
and `cloud-init status --wait` → rsync the suite → mint a token if `--funnel` →
preflight → run k6 → rsync the JSON summary into `loadtest/results/<run-id>/` →
delete the server from an `EXIT` trap, including on Ctrl-C.

`--pay` is refused with `--remote`: the Stripe key must stay on your machine.

## 5. The suites

### Read path (`k6/read-path.js`)

Anonymous, read-only, no auth.

| Endpoint                                          | Share | Why it is in the mix          |
| ------------------------------------------------- | ----- | ----------------------------- |
| `GET /api/v1/search/hotels`                       | 30%   | heaviest query; owns the tail |
| `GET /api/v1/hotels/:hotelId`                     | 25%   | detail page, media joins      |
| `GET /api/v1/hotels/:hotelId/rooms`               | 20%   | availability + pricing        |
| `GET /api/v1/search/hotels/:hotelId/availability` | 20%   | per-hotel availability        |
| `GET /api/v1/search/destinations/trending`        | 5%    | cheap, cacheable sanity check |

Shape: 1 min ramp to 4 VUs → 1 min to `PEAK_VUS` → 8 min at peak → 30 s down.
Total ~10m30s. The mix rotates on a 20-step cycle, so even a 20-second smoke run
touches every endpoint.

```bash
make loadtest                                  # prod, 12 peak VUs, ~10m30s
make loadtest-smoke                            # 2 VUs, 20 s, script check only
./loadtest/scripts/run.sh --vus 25 --city "Da Nang"
```

### Booking funnel (`k6/booking-funnel.js`)

Writes real rows, so it is gated: it refuses to start without `AUTH_TOKEN` **and**
`ALLOW_WRITES=true`.

```bash
make loadtest-funnel                           # 10m, no payment
./loadtest/scripts/run.sh --funnel --duration 5m
```

- One booking per 15 s, to stay under the write limiter and keep cleanup small.
- The bookable window is **discovered**, not assumed: `setup()` probes the next
  four weeks and only books dates that return hotels. Inventory is ~30 days deep
  locally and has nothing at 60 days in prod, so a fixed offset breaks.
- Each iteration mirrors a guest: search → hotel → rooms → hold → book.
- `POST /api/bookings` requires an `Idempotency-Key`; the hold id is used, which
  is unique per iteration and keeps retries idempotent.

Token for the funnel:

```bash
export KEYCLOAK_URL=https://keycloak.trestay.com
export LOADTEST_USERNAME=loadtest@trestay.com
export LOADTEST_PASSWORD=…                       # or prompt: read -rs LOADTEST_PASSWORD

./loadtest/scripts/get-token.sh --verify         # prints the claims the API checks
```

Needs `{"email_verified": true, "aud": "travelnest-web", "azp": "travelnest-loadtest"}`.
The client is `travelnest-loadtest` (public, direct access grants, 30-minute
tokens); the user has no pending required actions. See
[`README.md`](./README.md) for how the client is declared.

### Paying bookings (realistic confirmation values)

By default the funnel stops at `pending_payment`, so
`booking_confirmation_*` never records. `--pay` makes each iteration pay the
booking immediately, which is what puts realistic numbers on the confirmation
panels:

```bash
make loadtest-funnel-pay
./loadtest/scripts/run.sh --funnel --pay --duration 3m
```

`run.sh` refuses to pay with a non-test key, and `STRIPE_SECRET_KEY` is read
from `deploy/k8s/.env.prod` (or `loadtest/.env`) — it never reaches the
ephemeral runner.

Per iteration, after the booking is created:

1. `POST /api/v1/bookings/:id/payment-intent` → `paymentIntentId`
2. `POST https://api.stripe.com/v1/payment_intents/:id/confirm` with `pm_card_visa`
3. poll `GET /api/v1/bookings/:id` until the webhook flips it to `confirmed`

Prod is in **Stripe test mode** (`sk_test_…`), so no money moves. The key stays
on the machine running k6 — never pass it to the ephemeral runner. Refuse to run
with a `sk_live_` key.

Measured, 17 bookings in ~4 minutes:

| Signal                                                          | Value                  |
| --------------------------------------------------------------- | ---------------------- |
| `booking_confirmation_duration_seconds` p50 / p95 / p99         | 5.1 s / 9.7 s / 21.9 s |
| `booking_confirmation_processing_seconds` p95 (webhook handler) | 49 ms                  |
| Payment conversion                                              | 100%                   |

The spread is Stripe's webhook delivery plus the guest's confirmation step, which
is exactly what the business SLA is supposed to include. The webhook handler
itself — the number worth alerting on — is tens of milliseconds.

Two notes:

- Paying waits for the webhook, so an iteration takes ~10 s instead of ~1 s. A
  3-minute run yields ~16 confirmations; a 10-minute run ~60. Percentiles want
  the latter.
- The funnel's client-side thresholds (`create-hold`, `funnel-rooms`) assume a
  generator near the cluster. Over a home link they can cross on network jitter
  alone — the server saw 135 ms p95 for `POST /hold` while the client saw 10 s.
  Use the ephemeral runner if the threshold result matters.

## 6. Reading the k6 summary

```
requests     4404 (7.0/s)          ← volume. Under a few hundred, p95 is a guess
failed       0.00%                 ← non-2xx. 429s appear here too

endpoint                    share      p50      p95      p99      max
search-hotels              30%     449ms    828ms    997ms   1412ms
hotel-detail               25%     129ms    435ms    577ms    801ms
hotel-rooms                20%     114ms    191ms    282ms    498ms
room-availability          20%      94ms    116ms    146ms    606ms
trending-destinations       5%     102ms    127ms    191ms    203ms

thresholds
  PASS  http_req_failed rate<0.01
  PASS  rate_limited count<1
  ...
```

How to read it:

1. **`rate_limited` must be 0.** Anything else means the run measured the
   limiter, not the API. Fix the token, do not interpret the numbers.
2. **Sample count first.** The summary warns below 500 requests. A 20-second
   smoke run is a plumbing check, never a baseline.
3. **Compare like with like.** Search carries 30% of the traffic and is the
   slowest route by design; its p95 sits ~4× the next route. Judge each endpoint
   against its own history, not against the others.
4. **p99 vs p95.** p99 is where waterfalls and cold caches live. A p95 that is
   fine with a p99 that is 5× larger means a minority of requests hit something
   slow — usually a cold read or a missing index.
5. **These are client-side numbers.** Subtract ~300–450 ms of Cloudflare/tunnel
   from a Helsinki run, and much more from a laptop, before comparing with the
   dashboard.

## 7. Reading the dashboards

Grafana Cloud → **Dashboards → folder `TravelNest`**. Three dashboards, all
filtered by two variables:

- `cluster` — fixed at `travelnest-test`.
- `route` — multi-value, defaults to **All** (`.*`). Pick a route to drill in;
  the alert emails deep-link straight into a specific route.

Set the time range to cover the run. The ramps are historical; "Last 6 hours"
will often be empty even though everything works.

### API performance (`travelnest-api-performance`)

| #   | Panel                            | Read it as                                                         |
| --- | -------------------------------- | ------------------------------------------------------------------ |
| 1   | Requests / s                     | traffic level. Confirm the ramp registered at all                  |
| 2   | p95 latency                      | headline SLO. Threshold 1 s; over the dashboard range              |
| 3   | p99 latency                      | tail; watch for p99 ≫ p95                                          |
| 4   | 5xx ratio                        | server errors only; 4xx is client behaviour                        |
| 5   | Latency percentiles — all routes | p50/p95/p99 over time; the shape of the curve                      |
| 6   | Requests by route                | which route dominates the mix                                      |
| 7   | Slowest routes by p95            | ranked tail; search should be on top                               |
| 8   | Where is the time going? (p95)   | HTTP vs MySQL vs Redis — the first panel to open when p95 rises    |
| 9   | SLO — share under 500 ms         | % served fast; normal is ≳90%                                      |
| 10  | Event loop lag p99               | Node saturation; sustained >150 ms means the process is struggling |

**Triage order when latency looks bad:** panel 8 (which layer) → panel 7 (which
route) → panel 10 (is Node the bottleneck) → MySQL. If panel 8 shows MySQL flat
while HTTP rises, the time is in application code; if MySQL rises with it, look
at the query plan or the buffer pool.

### Booking funnel (`travelnest-booking-funnel`)

| #   | Panel                                 | Read it as                                                    |
| --- | ------------------------------------- | ------------------------------------------------------------- |
| 11  | Confirmations / min                   | business throughput; 0 without real payments                  |
| 12  | Payment conversion                    | confirmations ÷ checkout starts                               |
| 13  | p95 hold → confirmed                  | end-to-end SLA, includes the guest's time on the payment page |
| 14  | p95 webhook → committed               | server-side webhook cost — **alert on this one**              |
| 15  | Booking stages — p95                  | all three stages on one axis                                  |
| 16  | Confirmation latency percentiles      | p50/p95/p99 of the confirmation stage                         |
| 17  | Payment conversion over time          | conversion trend; dips = failures/abandonment                 |
| 18  | Checkouts vs confirmations per minute | the funnel shape over time                                    |

Panels 11–18 need a **confirmed** booking. The synthetic run stops at
`pending_payment`, so only the checkout stage (`booking_checkout_duration_seconds`)
fills unless a real Stripe test payment is processed (`--pay`).

Two conventions keep these panels honest:

- **The stat boxes (2, 3, 13, 14) summarize the dashboard time range**, not the
  last five minutes — a run that finished an hour ago still shows its numbers.
  A blank box means the run is outside the range; widen it (e.g. `Last 6 hours`)
  or pick the window that covers the run.
- **Counting panels end in `or vector(0)`** so a zero reads **0**, not
  `No data`. A real `No data` (13/14 on a `--funnel` run without `--pay`) means
  no confirmed booking in the range at all.

### Capacity (`travelnest-capacity`)

| #     | Panel                                           | Read it as                                        |
| ----- | ----------------------------------------------- | ------------------------------------------------- |
| 19–24 | Event loop, heap, memory, pool (stats + series) | Node process health                               |
| 25    | DB pool connections                             | `used` approaching `max` = queueing               |
| 26    | Redis p95 by command                            | cache latency; small and flat normally            |
| 27    | Queue depth by queue                            | BullMQ backlog (bookingExpiry, etc.)              |
| 28    | Worker job p95 by queue                         | background job latency                            |
| 29    | Worker job failures                             | non-zero demands a look; flat 0 is healthy        |
| 30    | Pod restarts (15m)                              | anything above 0 means something is crash-looping |

## 8. The four signals

Every latency question reduces to these:

1. **Latency** — p50/p95/p99 per route. p95 is the SLO; p99 is the risk.
2. **Traffic** — requests/s per route. High latency at 0.02 req/s is meaningless;
   the same latency at 8 req/s is a capacity fact.
3. **Errors** — `http_requests_total{status_class}` and `http_req_failed`. 5xx is
   the server's fault, 4xx is the client's, 429 is the limiter.
4. **Saturation** — the resources that cause queueing: event loop lag, DB pool
   (`used / max`), MySQL query time, Redis latency, queue depth.

A healthy response to doubling traffic: traffic up, latency flat or slightly up,
saturation flat. A saturated one: traffic flat, latency up, one saturation signal
pinned.

## 9. PromQL cookbook

Run any of these with `gcx metrics query '<expr>'` (add `--time <RFC3339>` to look
at a past moment). Ratios and percentiles always come from histograms — never
average per-pod numbers.

```promql
# request rate
sum(rate(http_requests_total{job="travelnest-api"}[5m]))

# p95 per route (ignore routes under ~0.2 req/s when interpreting)
topk(10, histogram_quantile(0.95,
  sum by (le, route) (rate(http_request_duration_seconds_bucket{job="travelnest-api"}[5m]))))

# p50 / p95 / p99 for one route
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{
  job="travelnest-api", route="/api/v1/search/hotels"}[5m])))

# share served under 500 ms (0.1, 0.2, 0.3, 0.5 are existing buckets — 0.4 is not)
sum(rate(http_request_duration_seconds_bucket{job="travelnest-api", le="0.5"}[5m]))
  / clamp_min(sum(rate(http_request_duration_seconds_count{job="travelnest-api"}[5m])), 1e-9)

# 5xx ratio
sum(rate(http_requests_total{job="travelnest-api", status_class="5xx"}[5m]))
  / clamp_min(sum(rate(http_requests_total{job="travelnest-api"}[5m])), 1e-9)

# which layer: MySQL vs Redis vs HTTP
histogram_quantile(0.95, sum by (le) (rate(db_query_duration_seconds_bucket{job="travelnest-api"}[5m])))
histogram_quantile(0.95, sum by (le) (rate(redis_command_duration_seconds_bucket{job="travelnest-api"}[5m])))

# saturation
nodejs_eventloop_lag_p99_seconds{job="travelnest-api"}
sum(db_pool_connections{job="travelnest-api", state="used"})
  / clamp_min(sum(db_pool_connections_max{job="travelnest-api"}), 1)
sum(bullmq_queue_jobs{job="travelnest-worker", state="waiting"})

# booking stages
histogram_quantile(0.95, sum by (le) (rate(booking_checkout_duration_seconds_bucket{flow="prepay"}[15m])))
histogram_quantile(0.95, sum by (le) (rate(booking_confirmation_duration_seconds_bucket{flow="prepay"}[30m])))
histogram_quantile(0.95, sum by (le) (rate(booking_confirmation_processing_seconds_bucket{flow="prepay"}[15m])))
```

Histogram buckets, so you know what is representable:

| Metric                                                                                         | Buckets (seconds) |
| ---------------------------------------------------------------------------------------------- | ----------------- |
| `http_request_duration_seconds`, `db_query_duration_seconds`, `redis_command_duration_seconds` | 0.005 … 10        |
| `job_duration_seconds`                                                                         | 0.01 … 300        |
| `booking_checkout_duration_seconds`                                                            | 1 … 600           |
| `booking_confirmation_duration_seconds`                                                        | 10 … 3600         |
| `booking_confirmation_processing_seconds`                                                      | 0.05 … 30         |

A quantile from a `le` value that is not in the list returns nothing — that is
exactly how the SLO panel stayed blank until it was pointed at `0.5`.

## 10. Alerts

17 rules in the `travelnest` folder, all carrying `service=travelnest`, routed to
`travelnest-email` (`phuonglesetainternational@gmail.com`). Thresholds are ~2×
the measured baseline.

| Rule                                 | Fires when      | For | Severity |
| ------------------------------------ | --------------- | --- | -------- |
| API p95 latency high                 | `> 1` s         | 10m | warning  |
| Search p95 latency high              | `> 1.5` s       | 10m | warning  |
| API error ratio high                 | `> 1%` 5xx      | 5m  | critical |
| MySQL p95 high                       | `> 0.3` s       | 10m | warning  |
| Event loop lag p99                   | `> 0.15` s      | 10m | warning  |
| DB pool saturated                    | `> 90%` used    | 10m | warning  |
| Queue backlog high                   | `> 200` waiting | 15m | warning  |
| Worker job p95 high                  | `> 30` s        | 15m | warning  |
| Booking checkout p95 high            | `> 5` s         | 15m | warning  |
| Booking confirmation processing slow | `> 5` s         | 10m | critical |
| Node memory high                     | `> 90%`         | 5m  | warning  |
| Node disk high                       | `> 85%`         | 10m | warning  |
| Node not ready                       | `Ready=false`   | 2m  | critical |
| Pod CrashLooping                     | any container   | 5m  | critical |
| Pod restarting                       | `> 3` in 15m    | —   | warning  |
| Container OOMKilled                  | any             | —   | critical |
| Deployment replicas unavailable      | any             | 10m | critical |

During a ramp it is normal to see threshold rules go **pending** (the `for`
window is filling) and then return to inactive. A rule that goes _firing_ means
the condition lasted past `for` — at that point either the system is genuinely
struggling or the threshold needs re-deriving from a run that was longer or
heavier than the one used to set it.

## 11. What normal looks like

From runs in November 2026 (12 VUs, ~7 req/s, 10m30s):

| Signal                               | Baseline        | Threshold |
| ------------------------------------ | --------------- | --------- |
| API p95 (all routes, server-side)    | 604 ms          | 1 s       |
| Search p95                           | 747 ms          | 1.5 s     |
| Hotel detail p95                     | 192 ms          | —         |
| Rooms p95                            | 67 ms           | —         |
| Availability p95                     | 25 ms           | —         |
| Trending p95                         | 43 ms           | —         |
| MySQL p95                            | 138 ms          | 300 ms    |
| Event loop p99                       | 74 ms           | 150 ms    |
| Checkout p95 (hold → booking)        | 1.58 s          | 5 s       |
| Client-side search p95, Helsinki     | 828 ms – 1.05 s | —         |
| Client-side search p95, laptop in VN | ~1.6 s          | —         |

Two facts that follow from the table: **search owns the tail**, and **MySQL is
the layer to suspect first** when overall p95 moves — it sits at 138 ms against a
300 ms threshold while the API has more headroom.

## 12. Troubleshooting

| Symptom                                         | Likely cause                                | Fix                                                            |
| ----------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `rate_limited > 0`, run aborts at ~300 requests | token missing/not applied                   | check the header preflight; confirm `BYPASS_TOKEN` is exported |
| Panels empty but the run had traffic            | time range does not cover the run           | widen to the last 24 h, or run again                           |
| Route panels empty, overall p95 fine            | `route` variable set to a stale value       | set it back to All                                             |
| `401` from the API                              | token expired (30 min)                      | re-mint with `get-token.sh`                                    |
| `403 EMAIL_VERIFICATION_REQUIRED`               | `email_verified` claim is false             | set the Keycloak user's email verified                         |
| `unauthorized_client` from Keycloak             | direct access grants disabled on the client | realm reconcile did not run; check the PostSync job            |
| `funnel_broken` climbing                        | chosen dates have no inventory              | the suite probes for this; widen `WINDOW_DAYS`                 |
| Funnel creates 0 bookings                       | hold failing                                | read the k6 `create-hold` check output                         |
| `No data` on confirmation panels                | no confirmed booking yet                    | `make loadtest-funnel-pay` (see §5)                            |
| Server still listed after a run                 | script interrupted before the trap          | `hcloud server delete <name>`                                  |
| Local run shows nothing in Grafana              | Alloy only scrapes the cluster              | expected — read the k6 summary                                 |

## 13. Cost and cleanup

- The ephemeral runner costs about **one cent** per session (cx23 at €0.0104/h,
  rounded up to a full hour) and deletes itself.
- **Stopping a Hetzner server does not stop billing.** Only deletion does. A
  stopped box costs the same as a running one (€6.49/mo for cx23, plus €0.60/mo
  for the IPv4).
- A 5-minute funnel run creates ~20 bookings, a 10-minute one ~35. With
  `PAY_NOW` each one also writes `payments`, `transactions` and
  `ledger_entries`, and flips the booking to `confirmed`. Clean up with
  [`scripts/cleanup-bookings.sql`](./scripts/cleanup-bookings.sql), which deletes
  children before parents and is safe to re-run:

```bash
scp loadtest/scripts/cleanup-bookings.sql hetzner:/tmp/cleanup.sql
ssh hetzner 'sudo kubectl exec -i -n travelnest mysql-0 -- \
  sh -c '\''mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -t < /dev/stdin'\'' < /tmp/cleanup.sql'
```

Locally, the same file runs through `make infra-mysql`.

The counters in Prometheus survive the cleanup — deleting rows does not erase
the observations the panels and alerts use.

The auto-provisioned `users` row for `loadtest@trestay.com` is left in place and
reused by later runs.

## Where things live

| Path                                     | Contents                                          |
| ---------------------------------------- | ------------------------------------------------- |
| `loadtest/k6/read-path.js`               | read-path scenario + per-route thresholds         |
| `loadtest/k6/booking-funnel.js`          | funnel scenario, window discovery, write gates    |
| `loadtest/scripts/run-on-hetzner.sh`     | ephemeral create → run → delete                   |
| `loadtest/scripts/get-token.sh`          | Keycloak password grant + claim check             |
| `loadtest/cloud-init.yaml`               | generator bootstrap (Docker, jq, rsync, k6 image) |
| `deploy/k8s/monitoring/dashboards/`      | the three dashboard JSONs                         |
| `deploy/k8s/monitoring/alerts/README.md` | rule definitions and threshold provenance         |
| `server/platform/metrics/`               | what the API actually measures                    |
