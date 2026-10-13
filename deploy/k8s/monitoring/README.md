# Grafana Cloud monitoring (k8s-monitoring)

Sends Kubernetes + host metrics from this cluster to **Grafana Cloud**, where the
prebuilt Kubernetes Monitoring dashboards live. Deployed via Argo CD as the
`monitoring` Application (`application.yaml`).

## How it works

- **Grafana Alloy** (`alloy-daemon`, a DaemonSet) sends metrics with
  `remote_write` to Grafana Cloud. Its scrape pipeline is **managed remotely**
  by **Fleet Management** (`collectorCommon.alloy.remoteConfig`), so the pipeline
  lives in Grafana Cloud, not here.
- **node-exporter** and **kube-state-metrics** expose host and Kubernetes-object
  metrics.
- Beyla (Application Observability) was **pruned** from the Fleet pipeline, so
  Alloy runs metrics only. The collector preset is `small` and the whole stack
  uses ~200 MiB.
- Nothing is exposed publicly: Alloy only makes **outbound** connections.

Local footprint ≈ **200 MiB**.

## Files

| Path | Purpose |
|---|---|
| `application.yaml` | Argo CD Application (2 sources: sealed Secret + Helm chart) |
| `secrets/` | KSOPS sealed Secret holding the Grafana Cloud token |
| `secrets/secret.template.yaml` | Plaintext template (`${GRAFANA_CLOUD_TOKEN}`) |
| `secrets/secret.enc.yaml` | SOPS/age-encrypted — safe to commit |

The AppProject is `default` (not `travelnest`) because the chart needs
cluster-scoped RBAC + a new namespace.

## Credentials

The Grafana Cloud credentials are stored **sealed** in `secrets/secret.enc.yaml`,
decrypted at sync time by KSOPS. The Secret must contain **both** keys the chart
reads:

- `username` — the Grafana Cloud **stack id** (e.g. `1867167`)
- `password` — the Cloud **token**

> Gotchas (learned the hard way):
> - The chart's remote-config secret mode reads `username`, `password` **and**
>   `tls.ca/cert/key` from the Secret when it is external (`secret.create=false`).
>   `application.yaml` therefore sets `remoteConfig.tls: null` to suppress the
>   mTLS block, and `remoteConfig.name` so `basic_auth` references the intended
>   Secret. `tls: null` requires a raw `helm.values` string — a `valuesObject`
>   loses the null (the API drops it).
> - Quote every value in `secret.template.yaml`. An unquoted numeric `username`
>   renders as a YAML int, which the Secret `stringData` (and Argo's patch)
>   rejects with `cannot convert int64 to string`.

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

## Remote pipeline (Fleet Management)

The scrape pipeline + destinations are managed in Grafana Cloud (Fleet
Management), not here. The onboarding survey's **Beyla** pipelines
(`ihub_kubernetes_survey*`) were deleted to drop Application Observability;
only the `k8s_monitoring_*` metrics pipelines remain. To change what is
collected, edit the pipelines in Fleet Management (or via `gcx fleet`), then
adjust the `presets` here.

## Access

- Dashboards: **grafana.com → your stack → Kubernetes → Monitoring** (cluster
  `travelnest-test`).
- No public endpoint / Cloudflare Tunnel needed.
