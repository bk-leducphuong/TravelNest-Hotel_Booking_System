# TravelNest Deployment & Infrastructure

This directory contains the deployment infrastructure for TravelNest.

## Deployment

Deployment is **Kubernetes + Argo CD GitOps** only — manifests live in
`deploy/k8s/` and Argo CD auto-syncs them.

| Track | Directory | Status |
|---|---|---|
| **Kubernetes + Argo CD** | `deploy/k8s/` | **Active** (only path) |

## Kubernetes GitOps Layout

```
deploy/k8s/
├── apps/                  Application workloads (base + local/prod overlays)
│   ├── admin-client/      Nuxt 4 admin dashboard
│   ├── analytics/         Go analytics microservice
│   ├── api/               Express API
│   ├── frontend/          Vue 3 user app
│   ├── media/             Go media microservice
│   ├── notification/      Go notification microservice
│   └── worker/            BullMQ worker
├── infra/                 In-cluster stateful services (base + overlays)
│   ├── keycloak/          Identity provider
│   ├── minio/             Object storage
│   ├── mysql/             Primary database (+ prod backup CronJob)
│   ├── nats/              Message bus
│   └── redis/             Cache and queues
├── environments/          One root per cluster
│   ├── base/              Shared namespace + AppProject
│   ├── prod/              Prod root kustomization + ApplicationSet
│   └── local/             Local root kustomization + ApplicationSet
├── local/                 Dev-only MongoDB/Elasticsearch + manual jobs
└── bootstrap/argocd/      Argo CD bootstrap manifests
```

Each cluster applies **one environment root** (`environments/<env>`), which
renders the namespace, the shared `AppProject`, and a single `ApplicationSet`.
The application-set controller turns each list element into an `Application`,
ordered by sync-wave (`10` infra → `20` services → `30` api/worker → `40`
frontends).

To bootstrap Argo CD on a cluster:

```bash
# prod
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml

# local (k3d)
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application-local.yaml
```

## CI/CD Model

GitHub Actions build and push Docker images to a container registry. Argo CD
detects changes to manifests in `deploy/k8s/` and syncs them into the cluster.

See [`deploy/docs/CICD.md`](docs/CICD.md) for the full pipeline description.

## Infrastructure Services

| Service | Purpose |
|---|---|
| **MySQL 8.0** | Primary application database |
| **Redis 7** | Caching, sessions, BullMQ queues |
| **Elasticsearch 8.11** | Hotel search (managed in prod) |
| **MongoDB** | Analytics (managed in prod) |
| **MinIO** | S3-compatible object storage (media + MySQL backups) |
| **NATS** | JetStream event bus for microservices |
| **Keycloak** | Identity and access management |

## External Managed Services

- MongoDB (analytics)
- Elasticsearch (search)
- Cloudflare Tunnel (public ingress)

## Scripts

`deploy/scripts/` contains:

- `secrets/` — SOPS + age key generation and prod/local secret sealing.
- `validate-manifests.sh` — renders every Kustomize target and schema-checks it
  with `kubeconform` (run in the `Validate Deploy Manifests` workflow).
- `setup-hotels-index.sh` — Elasticsearch hotels index setup.

---

📖 See [`deploy/k8s/README.md`](k8s/README.md) and the
**[Wiki: Deployment](https://github.com/bk-leducphuong/TravelNest/wiki/Deployment)**
and **[Wiki: CI-CD](https://github.com/bk-leducphuong/TravelNest/wiki/CI-CD)**.
