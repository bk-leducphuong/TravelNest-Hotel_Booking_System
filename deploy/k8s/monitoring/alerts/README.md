# Recommended alert rules

Alerting lives in **Grafana Cloud** (Grafana Alerting), not in the cluster. The
metrics below come from the k8s-monitoring stack (`node-exporter`,
`kube-state-metrics`) and carry the label `cluster="travelnest-test"`.

## Rules

| Alert | PromQL | Fires when | For |
|---|---|---|---|
| **Node memory high** | `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100` | `> 90` | 5m |
| **Node disk high** | `(1 - node_filesystem_avail_bytes{fstype!~"tmpfs\|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs\|overlay"}) * 100` | `> 85` | 10m |
| **Node not ready** | `kube_node_status_condition{condition="Ready",status="true"} == 0` | `== 1` | 2m |
| **Pod CrashLooping** | `kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} > 0` | `> 0` | 5m |
| **Pod restarting** | `increase(kube_pod_container_status_restarts_total[15m])` | `> 3` | 0s |
| **Container OOMKilled** | `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} > 0` | `> 0` | 0s |
| **Deployment replicas unavailable** | `kube_deployment_status_replicas_unavailable > 0` | `> 0` | 10m |

Suggested labels: `severity` = `warning` (memory/disk) or `critical`
(node-down/crashloop). Send notifications to a contact point (email or a
webhook such as Slack/Discord).

## Apply

Three ways — use whichever fits:

1. **Grafana Cloud UI** (simplest): *Alerts & IRM → Alert rules → New alert
   rule* → pick the Prometheus datasource → paste the PromQL → set the
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
