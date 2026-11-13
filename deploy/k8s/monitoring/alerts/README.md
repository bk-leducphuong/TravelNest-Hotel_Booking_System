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

These depend on the API's own metrics (`job="travelnest-api"`) and are **not
applied yet** — create them in Grafana Cloud Alerting once the metrics have been
flowing for a day so the thresholds can be baselined.

| Alert                                    | PromQL                                                                                                                                       | Fires when | For | Dashboard                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --- | ---------------------------- |
| **API p95 latency high**                 | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="travelnest-api"}[5m])))`                               | `> 0.5`    | 10m | `travelnest-api-performance` |
| **Search p95 latency high**              | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="travelnest-api",route="/api/v1/search/hotels"}[5m])))` | `> 0.5`    | 10m | `travelnest-api-performance` |
| **API error ratio high**                 | `sum(rate(http_requests_total{job="travelnest-api",status_class="5xx"}[5m])) / sum(rate(http_requests_total{job="travelnest-api"}[5m]))`     | `> 0.01`   | 5m  | `travelnest-api-performance` |
| **MySQL p95 high**                       | `histogram_quantile(0.95, sum by (le) (rate(db_query_duration_seconds_bucket[5m])))`                                                         | `> 0.05`   | 10m | `travelnest-api-performance` |
| **Event loop lag p99**                   | `nodejs_eventloop_lag_p99_seconds{job="travelnest-api"}`                                                                                     | `> 0.05`   | 10m | `travelnest-capacity`        |
| **Worker job p95 high**                  | `histogram_quantile(0.95, sum by (le) (rate(job_duration_seconds_bucket{job="travelnest-worker"}[15m])))`                                    | `> 30`     | 15m | `travelnest-capacity`        |
| **Queue backlog high**                   | `sum(bullmq_queue_jobs{job="travelnest-worker",state="waiting"})`                                                                            | `> 200`    | 15m | `travelnest-capacity`        |
| **DB pool saturated**                    | `sum(db_pool_connections{job="travelnest-api",state="used"}) / clamp_min(sum(db_pool_connections_max{job="travelnest-api"}), 1)`             | `> 0.9`    | 10m | `travelnest-capacity`        |
| **Booking confirmation processing slow** | `histogram_quantile(0.95, sum by (le) (rate(booking_confirmation_processing_seconds_bucket{flow="prepay"}[15m])))`                           | `> 5`      | 10m | `travelnest-booking-funnel`  |
| **Booking checkout p95 high**            | `histogram_quantile(0.95, sum by (le) (rate(booking_checkout_duration_seconds_bucket{flow="prepay"}[15m])))`                                 | `> 120`    | 15m | `travelnest-booking-funnel`  |

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
