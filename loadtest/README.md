# Load testing

[k6](https://k6.io) suites that generate the traffic this environment otherwise
never sees. There are no real users on this deployment, so a load test is the
only thing that:

- gives `histogram_quantile` enough samples to mean anything (at idle, a 5-minute
  window holds single-digit requests);
- exercises the `booking_*` business histograms at all;
- tells you where the system bends, so the Grafana thresholds in
  [`../deploy/k8s/monitoring/alerts/README.md`](../deploy/k8s/monitoring/alerts/README.md)
  can be derived from a measurement instead of a guess.

k6 runs from the `grafana/k6:2.4.0` container, so nothing needs installing.

## Read path

Anonymous, read-only, no writes. Drives the five routes that produce most of the
API latency signal:

| Endpoint                                   | Weight | Why                                       |
| ------------------------------------------ | ------ | ----------------------------------------- |
| `GET /api/v1/search/hotels`                | 30%    | heaviest query; owns the MySQL tail       |
| `GET /api/v1/hotels/:hotelId`              | 25%    | detail page, media joins                  |
| `GET /api/v1/hotels/:hotelId/rooms`        | 20%    | availability + pricing                    |
| `GET /api/v1/search/hotels/:id/availability` | 20%  | per-hotel availability                    |
| `GET /api/v1/search/destinations/trending` | 5%     | cheap, cacheable, sanity check            |

```bash
make load-test-read                          # default: prod, 12 peak VUs, ~10 min
BASE_URL=http://localhost:3000 make load-test-read
PEAK_VUS=25 make load-test-read              # find the knee faster
CITY=Da\ Nang make load-test-read            # different data set
```

Shape: 1 min ramp to 4 VUs, 1 min to peak, 8 min at peak, 30 s ramp down.
The run must be **at least ~10 minutes**: Alloy scrapes every 60 s and the
alert rules use 5-minute `rate()` windows, so anything shorter yields a handful
of points and quantiles that move on noise. Results land in
`loadtest/results/` as k6 summary JSON.

## Booking funnel (writes data)

`loadtest/k6/booking-funnel.js` performs hold → pending booking → read-back,
which is what feeds `booking_checkout_duration_seconds`. It creates real rows,
so it stays behind two explicit gates:

```bash
AUTH_TOKEN=<keycloak access token> ALLOW_WRITES=true make load-test-booking
```

- Throughput is ~1 booking / 15 s to stay under the write limiter (60 requests
  per 15 min on `POST /hold` and `POST /bookings`). A 10-minute run creates ~35
  bookings.
- Each iteration books a different check-in date (30–119 days out) so the run
  spreads across inventory instead of exhausting one room-day.
- The confirmation stages (`booking_confirmation_*`) need a real Stripe payment
  and webhook, so this suite stops at checkout. Those panels stay empty until a
  Stripe test-mode flow exists.

**Getting an `AUTH_TOKEN`:** the API authenticates with Keycloak bearer tokens
and the `travelnest-web` client has direct-access grants disabled
(`unauthorized_client`), so a password grant cannot be scripted today. Mint a
token with either:

1. a dedicated Keycloak client with direct-access grants enabled, scoped to a
   guest role, and a throwaway user; or
2. a browser session — copy the `access_token` from the network tab.

Until one of those exists, run the read path only.

## The rate limiter will throttle you

`server/middlewares/rate-limitter.middleware.js` allows **300 requests / 15 min
per client** (`RATE_LIMIT_MAX`) and **60 writes / 15 min** (`RATE_LIMIT_WRITE_MAX`).
A 12-VU read test issues a few thousand requests, so it trips HTTP 429 within
seconds.

Exempt the generator instead of disabling throttling — `RATE_LIMIT_ALLOWLIST`
takes a comma-separated list of addresses and CIDR subnets that skip the global
and write limiters, while every other client stays limited:

```yaml
# deploy/k8s/apps/api/overlays/prod/configmap.yaml
RATE_LIMIT_ALLOWLIST: "203.0.113.10"        # the load VM's egress IP
```

```bash
# local: just export it before starting the server
RATE_LIMIT_ALLOWLIST=127.0.0.1 node server.js
```

- Client identity comes from Cloudflare's `CF-Connecting-IP`, not `req.ip`, so
  the allowlist works through Cloudflare Tunnel → Traefik. See
  [`server/utils/clientIp.util.js`](../server/utils/clientIp.util.js).
- The auth limiter is deliberately **not** exempted, so a bypass cannot be
  turned into credential stuffing.
- Addresses are matched exactly or by CIDR; malformed entries are ignored
  rather than failing open.
- Commit the allowlist → let Argo CD sync → run the test → remove it and sync
  again. `RATE_LIMIT_ENABLED=false` still works as a blunt fallback, but it
  removes throttling for everyone.

The scripts abort after two consecutive 429s rather than reporting a throttle as
latency, so a misconfigured allowlist fails loudly instead of producing a fast,
meaningless curve.

## After a run

1. Read `p95` per endpoint from the summary.
2. Set each Grafana threshold to roughly **2–3× the measured peak p95** — tight
   enough to fire on a real regression, loose enough not to page on a normal
   spike.
3. Update the threshold table in
   [`../deploy/k8s/monitoring/alerts/README.md`](../deploy/k8s/monitoring/alerts/README.md)
   with the measured numbers and the run date, so the numbers have provenance.
4. Cross-check the dashboards: a run should be visible as a step in request rate
   on `travelnest-api-performance` within a minute of starting.

## What this does not answer

The VPS is a single CAX21 with one API replica capped at 1 CPU, sharing the box
with MySQL, Redis, MinIO, MongoDB, NATS and Keycloak. A load test tells you where
*that* deployment bends. It is not a capacity plan, and it does not replace
traffic from real users — there are none.
