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
- **Beyla** (`beyla-k8s-cache` + the in-Alloy eBPF subprocess) provides
  Application Observability, driven by the Fleet pipeline. Because Beyla runs,
  the collector preset must be `large` (2 GiB limit) — `medium` OOMs.
- Nothing is exposed publicly: Alloy only makes **outbound** connections.

Local footprint ≈ **900 MiB – 1 GiB**.

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

The Grafana Cloud token is stored **sealed** in `secrets/secret.enc.yaml`,
decrypted at sync time by KSOPS, and read by Alloy via `secretKeyRef`. To rotate:

```bash
RECIP=$(age-keygen -y deploy/k8s/.age/keys.txt)
export GRAFANA_CLOUD_TOKEN='<new glc_ token>'
envsubst '${GRAFANA_CLOUD_TOKEN}' < secrets/secret.template.yaml > /tmp/plain.yaml
CFG=$(mktemp)
printf "creation_rules:\n  - path_regex: '.'\n    encrypted_regex: '^(data|stringData)$'\n    age: %s\n" "$RECIP" > "$CFG"
SOPS_AGE_KEY_FILE=deploy/k8s/.age/keys.txt sops -e --config "$CFG" \
  --input-type yaml --output-type yaml /tmp/plain.yaml > secrets/secret.enc.yaml
rm -f "$CFG" /tmp/plain.yaml
```

## Remote pipeline (Fleet Management)

The scrape pipeline + destinations are managed in Grafana Cloud (Fleet
Management). To change what is collected (e.g. drop Beyla to shrink Alloy), edit
the pipeline there, then lower the `presets` to `medium`/`small` here.

## Access

- Dashboards: **grafana.com → your stack → Kubernetes → Monitoring** (cluster
  `travelnest-test`).
- No public endpoint / Cloudflare Tunnel needed.
