# TravelNest Helm (platform values)

These are **values-only** files for third-party charts. There are no
first-party charts here: the TravelNest applications stay as Kustomize
manifests under `deploy/k8s/` and are delivered by Argo CD.

The charts are installed by Terraform (see `../terraform/modules/addons`), which
passes each `values-aws-prod.yaml` to a `helm_release`.

| Chart | Namespace | Purpose |
|---|---|---|
| `traefik/traefik` | `traefik` | Ingress controller; provides the `traefik` IngressClass the manifests require, fronted by an internet-facing NLB. |
| `argo/argo-cd` | `argocd` | GitOps engine. KSOPS is baked into the repo-server so it can decrypt `secret.enc.yaml`. |
| `jetstack/cert-manager` | `cert-manager` | Issues TLS certs via Let's Encrypt DNS-01 (Route53, IRSA). |
| `kubernetes-sigs/external-dns` | `external-dns` | Creates Route53 records from the Traefik LoadBalancer annotation. |
| `kubernetes-sigs/metrics-server` | `kube-system` | HPA metrics. |
| `kubernetes/autoscaler` (cluster-autoscaler) | `kube-system` | Node autoscaling for the managed node group. |
| `prometheus-community/kube-prometheus-stack` | `monitoring` | Optional; `enable_monitoring = false` by default. |

Dynamic values (IRSA role ARNs, cluster name, region, domain, Let's Encrypt
email) are injected by Terraform via `set`, not stored here.

## Local rendering

```bash
helm repo add traefik https://traefik.github.io/charts
helm template traefik traefik/traefik -f traefik/values-aws-prod.yaml
```
