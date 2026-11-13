# Grafana Cloud monitoring (k8s-monitoring)

Sends Kubernetes, host and application metrics from this cluster to **Grafana
Cloud**, where the prebuilt Kubernetes Monitoring dashboards live plus the
latency panels built from the API's own metrics.

Deployed via Argo CD as the `monitoring` Application (`application.yaml`).

## How it works

- **Grafana Alloy** (`alloy-daemon`, a DaemonSet) scrapes the cluster and
  `remote_write`s to Grafana Cloud. Its whole pipeline is defined in
  [`values.yaml`](./values.yaml) — **not** in Fleet Management any more.
- **node-exporter** and **kube-state-metrics** expose host and Kubernetes-object
  metrics; `clusterMetrics` scrapes cAdvisor, kubelet, kube-state-metrics and
  node-exporter.
- **`annotationAutodiscovery`** scrapes pods annotated with
  `k8s.grafana.com/scrape`. The API (`job="travelnest-api"`) and the BullMQ
  worker (`job="travelnest-worker"`) use it.
- Every series carries `cluster="travelnest-test"`, set from `cluster.name`.
- Nothing is exposed publicly: Alloy only makes **outbound** connections, and
  the app metrics ports (API `9464`, worker `4001`) are only reachable
  in-cluster.

Local footprint ≈ **200–360 MiB** (collector preset `small`).

## Files

| Path                           | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| `application.yaml`             | Argo CD Application (3 sources: sealed Secret, value files, Helm chart)    |
| `values.yaml`                  | **Source of truth** for the telemetry pipeline                             |
| `secrets/`                     | KSOPS sealed Secret holding the Grafana Cloud credentials                  |
| `secrets/secret.template.yaml` | Plaintext template (`${GRAFANA_CLOUD_USERNAME}`, `${GRAFANA_CLOUD_TOKEN}`) |
| `secrets/secret.enc.yaml`      | SOPS/age-encrypted — safe to commit                                        |
| `alerts/`                      | Recommended alert rules (live in Grafana Cloud Alerting)                   |

The AppProject is `default` (not `travelnest`) because the chart needs
cluster-scoped RBAC + a new namespace.

## Credentials

The Grafana Cloud credentials are stored **sealed** in `secrets/secret.enc.yaml`,
decrypted at sync time by KSOPS. The Secret contains two keys:

- `username` — the Grafana Cloud **stack id** (`1867167`). Prefixed by Grafana
  tooling keys; it is also used by Fleet tooling, not by remote write.
- `password` — the Cloud token (`glc_…`). It is injected into Alloy as
  `GCLOUD_RW_API_KEY` (see `alloy.extraEnv` in `values.yaml`) and read by the
  destination with `passwordFrom: sys.env("GCLOUD_RW_API_KEY")`, so the token
  never appears in Git or in the rendered Alloy config.

The Prometheus **instance id** (`3658557`) is not a secret and lives directly in
`values.yaml`. The token must keep the `metrics:write` scope or Alloy's remote
writes will fail with 401.

To rotate:

```bash
RECIP=$(age-keygen -y deploy/k8s/.age/keys.txt)
export GRAFANA_CLOUD_USERNAME='1867167'
export GRAFANA_CLOUD_TOKEN='<new glc_ token>'
envsubst '${GRAFANA_CLOUD_USERNAME} ${GRAFANA_CLOUD_TOKEN}' < secrets/secret.template.yaml > /tmp/plain.yaml
CFG=$(mktemp)
printf "creation_rules:\n  - path_regex: '.'\n    encrypted_regex: '^(data|stringData)$'\n    age: %s\n" "$RECIP" > "$CFG"
SOPS_AGE_KEY_FILE=deploy/k8s/.age/keys.txt sops -e --config "$CFG" \
  --input-type yaml --output-type yaml /tmp/plain.yaml > secrets/secret.enc.yaml
rm -f "$CFG" /tmp/plain.yaml
```

## History: Fleet Management replacement

Until Nov 2026 the scrape pipeline was delivered by Grafana Cloud **Fleet
Management** (`collectorCommon.alloy.remoteConfig` + the `k8s_monitoring_*`
pipelines). It now lives in `values.yaml` so monitoring changes are reviewable
diffs in Git.

The old Fleet pipelines still exist in Grafana Cloud. Keep them during the soak
period: if the Git-managed pipeline has to be rolled back, `git revert` the
cutover commit and Alloy resumes fetching from Fleet. Once the new pipeline has
been stable for a few days, delete or disable the `k8s_monitoring_*` pipelines.

## Changing what is collected

1. Edit `values.yaml`.
2. Render locally (Helm is not installed on the dev machine):

   ```bash
   docker run --rm -v "$PWD:/apps" alpine/helm:3.16 \
     template grafana-cloud grafana/k8s-monitoring \
     --repo https://grafana.github.io/helm-charts --version 4.5.3 \
     -n monitoring -f /apps/deploy/k8s/monitoring/values.yaml > /tmp/monitoring.yaml
   ```

3. Commit and let Argo CD sync. Alloy rolls with the new config.

Scrape targets are declared by annotation on the workload, so adding a new app
metric endpoint means adding the annotation to its Deployment:

```yaml
metadata:
  annotations:
    k8s.grafana.com/scrape: "true"
    k8s.grafana.com/job: my-service
    k8s.grafana.com/metrics.portName: metrics
```

## API latency (percentiles)

The API exports Prometheus histograms; compute percentiles in Grafana, never by
averaging per-pod numbers:

```promql
# p50 / p95 / p99 for the whole API
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="travelnest-api"}[5m])))

# slowest routes by p95 (ignore routes below ~0.2 req/s)
topk(10, histogram_quantile(0.95,
  sum by (le, route) (rate(http_request_duration_seconds_bucket{job="travelnest-api"}[5m]))))

# share of traffic served under 400ms
sum(rate(http_request_duration_seconds_bucket{job="travelnest-api", le="0.4"}[5m]))
  / sum(rate(http_request_duration_seconds_count{job="travelnest-api"}[5m]))

# MySQL vs Redis vs HTTP: which layer moved?
histogram_quantile(0.95, sum by (le) (rate(db_query_duration_seconds_bucket[5m])))
histogram_quantile(0.95, sum by (le) (rate(redis_command_duration_seconds_bucket[5m])))

# Booking flow: hold -> pending booking (checkout)
histogram_quantile(0.95, sum by (le) (rate(booking_checkout_duration_seconds_bucket{flow="prepay"}[15m])))

# Booking flow: hold -> confirmed (business SLA, includes the guest's payment time)
histogram_quantile(0.95, sum by (le) (rate(booking_confirmation_duration_seconds_bucket{flow="prepay"}[30m])))

# Booking flow: webhook received -> transaction committed (what you alert on)
histogram_quantile(0.95, sum by (le) (rate(booking_confirmation_processing_seconds_bucket{flow="prepay"}[15m])))
```

`route` is the Express pattern (`/api/v1/hotels/:id/rooms`), so identifiers never
become labels. Health checks, `/metrics`, `/admin/queues` and `/api-docs` are
excluded from the HTTP histogram.

Booking metrics are labelled by payment policy (`flow="prepay"` or
`pay_at_property`). The business metric starts at room-hold creation, using the
hold timestamp carried into the payment transaction metadata, so it needs no
extra query at confirmation time. A payment that arrives after the booking was
cancelled is refunded, not confirmed, and is never observed.

### Dashboards

Owned dashboards live in [`dashboards/`](./dashboards) and are imported manually
(Dashboards → New → Import → upload JSON, then pick the Prometheus data source
and the `travelnest-test` cluster):

| Dashboard                    | Audience          | Covers                                                                                                                   |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `travelnest-api-performance` | Backend on-call   | request rate, p50/p95/p99 overall and per route, slowest routes, HTTP/MySQL/Redis split, SLO under 400ms, event-loop lag |
| `travelnest-booking-funnel`  | Product + backend | confirmations/min, payment conversion, checkout/confirmation/webhook stages                                              |
| `travelnest-capacity`        | Infra/SRE         | event-loop lag, heap/RSS, DB pool saturation, Redis p95, BullMQ queue depth/failures, pod restarts                       |

The prebuilt Kubernetes monitoring dashboards stay untouched in the
`GrafanaCloud` folder; these three are the only ones this repo owns.

## Access

- Dashboards: **grafana.com → your stack → Kubernetes → Monitoring** (cluster
  `travelnest-test`).
- No public endpoint / Cloudflare Tunnel needed.
- Alerting lives in **Grafana Cloud** (Grafana Alerting), not in the cluster —
  see [`alerts/README.md`](./alerts/README.md).
