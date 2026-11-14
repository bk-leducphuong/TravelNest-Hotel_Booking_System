# Recommended alert rules

Alerting lives in **Grafana Cloud** (Grafana Alerting), not in the cluster. The
metrics below come from the k8s-monitoring stack (`node-exporter`,
`kube-state-metrics`) and carry the label `cluster="travelnest-test"`.

## Rules

Cluster rules open the prebuilt Kubernetes Monitoring dashboards (owned by
Grafana, not by this repo):

| Alert                               | PromQL                                                                                                                     | Fires when | For | Dashboard                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- | --- | -------------------------- |
| **Node memory high**                | `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100`                                                  | `> 90`     | 5m  | K8s Monitoring (Nodes)     |
| **Node disk high**                  | `(1 - node_filesystem_avail_bytes{fstype!~"tmpfs\|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs\|overlay"}) * 100` | `> 85`     | 10m | K8s Monitoring (Nodes)     |
| **Node not ready**                  | `kube_node_status_condition{condition="Ready",status="true"} == 0`                                                         | `== 1`     | 2m  | K8s Monitoring (Nodes)     |
| **Pod CrashLooping**                | `kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} > 0`                                                  | `> 0`      | 5m  | K8s Monitoring (Workloads) |
| **Pod restarting**                  | `increase(kube_pod_container_status_restarts_total[15m])`                                                                  | `> 3`      | 0s  | K8s Monitoring (Workloads) |
| **Container OOMKilled**             | `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} > 0`                                                 | `> 0`      | 0s  | K8s Monitoring (Workloads) |
| **Deployment replicas unavailable** | `kube_deployment_status_replicas_unavailable > 0`                                                                          | `> 0`      | 10m | K8s Monitoring (Workloads) |

Suggested labels: `severity` = `warning` (memory/disk) or `critical`
(node-down/crashloop). Send notifications to a contact point (email or a
webhook such as Slack/Discord).

## API latency and saturation rules

These depend on the API's own metrics (`job="travelnest-api"`) and are **applied**
— 17 rules in the `travelnest` folder, groups `travelnest-node`,
`travelnest-workloads` and `travelnest-api-slo`.

Thresholds are derived from a measured baseline, not guessed. See
[Measured baseline](#measured-baseline) for the run that produced them.

| Alert                                    | PromQL                                                                                                                                       | Fires when | For | Dashboard                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --- | ---------------------------- |
| **API p95 latency high**                 | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="travelnest-api"}[5m])))`                               | `> 1`      | 10m | `travelnest-api-performance` |
| **Search p95 latency high**              | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="travelnest-api",route="/api/v1/search/hotels"}[5m])))` | `> 1.5`    | 10m | `travelnest-api-performance` |
| **API error ratio high**                 | `sum(rate(http_requests_total{job="travelnest-api",status_class="5xx"}[5m])) / sum(rate(http_requests_total{job="travelnest-api"}[5m]))`     | `> 0.01`   | 5m  | `travelnest-api-performance` |
| **MySQL p95 high**                       | `histogram_quantile(0.95, sum by (le) (rate(db_query_duration_seconds_bucket[5m])))`                                                         | `> 0.3`    | 10m | `travelnest-api-performance` |
| **Event loop lag p99**                   | `nodejs_eventloop_lag_p99_seconds{job="travelnest-api"}`                                                                                     | `> 0.15`   | 10m | `travelnest-capacity`        |
| **Worker job p95 high**                  | `histogram_quantile(0.95, sum by (le) (rate(job_duration_seconds_bucket{job="travelnest-worker"}[15m])))`                                    | `> 30`     | 15m | `travelnest-capacity`        |
| **Queue backlog high**                   | `sum(bullmq_queue_jobs{job="travelnest-worker",state="waiting"})`                                                                            | `> 200`    | 15m | `travelnest-capacity`        |
| **DB pool saturated**                    | `sum(db_pool_connections{job="travelnest-api",state="used"}) / clamp_min(sum(db_pool_connections_max{job="travelnest-api"}), 1)`             | `> 0.9`    | 10m | `travelnest-capacity`        |
| **Booking confirmation processing slow** | `histogram_quantile(0.95, sum by (le) (rate(booking_confirmation_processing_seconds_bucket{flow="prepay"}[15m])))`                           | `> 5`      | 10m | `travelnest-booking-funnel`  |
| **Booking checkout p95 high**            | `histogram_quantile(0.95, sum by (le) (rate(booking_checkout_duration_seconds_bucket{flow="prepay"}[15m])))`                                 | `> 5`      | 15m | `travelnest-booking-funnel`  |

## Measured baseline

Thresholds above are ~2× the p95 measured under sustained load, not a guess.

| | |
| --- | --- |
| Run | 2026-11-14 12:03–12:14 UTC |
| Generator | `tn-loadgen` (cx23, Helsinki `hel1`), k6 `grafana/k6:2.4.0` |
| Load | 12 VUs, ramped, 10m30s, **4,217 requests / 6.7 req/s**, 0 failures, 0 × 429 |
| Exempted | `RATE_LIMIT_ALLOWLIST` (both IPv4 and the server's IPv6 /64) |

Server-side p95, from the in-process histograms the rules read:

| Metric | p95 | Threshold | Headroom |
| --- | --- | --- | --- |
| `http_request_duration_seconds` (all routes) | 604 ms | 1 s | 1.7× |
| `…{route="/api/v1/search/hotels"}` | 747 ms | 1.5 s | 2.0× |
| `…{route="/api/v1/hotels/:hotelId"}` | 192 ms | — | — |
| `…{route="/api/v1/hotels/:hotelId/rooms"}` | 67 ms | — | — |
| `…{route="/api/v1/search/hotels/:hotelId/availability"}` | 25 ms | — | — |
| `…{route="/api/v1/search/destinations/trending"}` | 43 ms | — | — |
| `db_query_duration_seconds` | 138 ms | 300 ms | 2.2× |
| `nodejs_eventloop_lag_p99_seconds` | 74 ms | 150 ms | 2.0× |

Client-side p95 from the same run (k6, so it includes Cloudflare + the tunnel —
300–450 ms of overhead the server-side numbers never see): search 1,046 ms,
hotel detail 589 ms, rooms 330 ms, availability 124 ms, trending 129 ms.

Search is the tail: it is ~4× the next route and drives the overall p95. If a
regression is going to appear anywhere, it will appear there first.

### Booking funnel

Same generator, separate run (2026-11-14 12:25–12:31 UTC): 1 VU, 5m, **19
bookings, 0 failures, 0 funnel breaks**, hold and booking both ~250 ms p95.

| Metric | p95 | Threshold | Notes |
| --- | --- | --- | --- |
| `booking_checkout_duration_seconds` | 1.58 s | 5 s | hold created → booking row; 17/19 under 1 s |
| `booking_confirmation_processing_seconds` | — | 5 s | needs a real Stripe payment + webhook; no data yet |

This is also the run that proved the checkout histogram works at all: before the
literal-timestamp fix it recorded **zero** observations, so that panel was empty
and the rule could never fire. The 5 s threshold replaces a 120 s placeholder
that was 76× the measurement.

## Linking rules to dashboards

Set two annotations on every rule so the notification opens the right place:

```json
{
  "annotations": {
    "__dashboardUid__": "travelnest-api-performance",
    "__panelId__": "2",
    "dashboard": "https://<stack>.grafana.net/d/travelnest-api-performance?var-cluster=travelnest-test&var-route=%2Fapi%2Fv1%2Fsearch%2Fhotels"
  }
}
```

- `__dashboardUid__` and `__panelId__` make Grafana jump straight to the panel.
- Add an explicit `dashboard` link when a variable must be pre-selected; the
  route probe (`/`) needs URL-encoding.
- Panel ids per dashboard are visible in the JSON under
  [`../dashboards/`](../dashboards).
- An API rule without a dashboard row above is incomplete: add the panel first,
  then the rule.

## Apply

Three ways — use whichever fits:

1. **Grafana Cloud UI** (simplest): _Alerts & IRM → Alert rules → New alert
   rule_ → pick the Prometheus datasource → paste the PromQL → set the
   threshold + `for` above.
2. **`gcx`** (once configured — see note below):
   ```bash
   gcx alert rules create --help   # then create each rule
   ```
3. **Provisioning API** (`POST /api/v1/provisioning/alert-rules` on your
   Grafana stack URL with a token that has `alerting:write`).

## Status

**Applied** in Grafana Cloud (folder `GrafanaCloud`), as two rule groups:

- `travelnest-node` — Node memory high, Node disk high, Node not ready
- `travelnest-workloads` — Pod CrashLooping, Pod restarting, Container OOMKilled, Deployment replicas unavailable

Data source: `grafanacloud-prom` (the stack's Prometheus).

## gcx setup (for future changes)

`gcx` is authenticated against the **Grafana stack** (not the Fleet Management
hostname):

```bash
gcx login --server https://<stack>.grafana.net --token <service-account glsa_ token>
gcx config use-context <stack-slug>
```

The service account needs at least `Editor` (or a custom role with
`datasources:reader` + `alerting:writer`). Note: the SA must have edit rights on
the target **folder**; the `GrafanaCloud` folder works, a freshly-created folder
may not (403 `alerting.unauthorized`).

Create/update rules via the provisioning API:

```bash
gcx api /api/v1/provisioning/alert-rules -d @rule.json          # create
gcx api /api/v1/provisioning/alert-rules/<uid> -X DELETE        # delete
```

### Fleet Management

Managing the remote-config **pipeline** (e.g. to drop Beyla) additionally needs a
**Cloud Access Policy token** (`glc_`) with `fleet-management:write`:

```bash
gcx login --context <ctx> --cloud-token <glc_ token>
```
