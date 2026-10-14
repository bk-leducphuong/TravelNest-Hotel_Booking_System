# TravelNest Deployment & Infrastructure

This directory contains the Kubernetes manifests and the supporting infrastructure
for running TravelNest.

## Deployment

Deployment is **Kubernetes + Argo CD GitOps** only — manifests live in
`deploy/k8s/` and Argo CD auto-syncs them.

| Track | Directory | Status |
|---|---|---|
| **Kubernetes + Argo CD** | `deploy/k8s/` | **Active** (only path) |
| Hetzner VPS (k3s + cloudflared) | `deploy/hetzner/` | Active |
| Terraform (managed cloud tier) | `deploy/terraform/` | Optional / alternate |

The live cluster is a single-node **k3s** cluster on a Hetzner CAX21 VPS (ARM64).
MySQL, Redis, MinIO, MongoDB, NATS and Keycloak run **in-cluster**; Elasticsearch
is **external** (Elastic Cloud). Public traffic arrives through a **Cloudflare
Tunnel**.

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
│   ├── superadmin-client/ Nuxt 4 superadmin console
│   └── worker/            BullMQ worker
├── infra/                 In-cluster stateful services (base + overlays)
│   ├── keycloak/          Identity provider
│   ├── minio/             Object storage
│   ├── mongodb/           Analytics events
│   ├── mysql/             Primary database (+ prod backup CronJob)
│   ├── nats/              Message bus
│   └── redis/             Cache and queues
├── environments/          One root per cluster
│   ├── base/              Shared namespace + AppProject
│   ├── prod/              Prod root kustomization + ApplicationSet
│   └── local/             Local root kustomization + ApplicationSet
├── monitoring/            Grafana Cloud (Alloy) monitoring Application
├── local/                 Dev-only MongoDB/Elasticsearch + manual jobs
└── bootstrap/argocd/      Argo CD bootstrap manifests (+ KSOPS patch)
```

Each cluster applies **one environment root** (`environments/<env>`), which
renders the namespace, the shared `AppProject`, and a single `ApplicationSet`.
The application-set controller turns each list element into an `Application`,
labelled by sync-wave (`10` infra → `20` services → `30` api/worker → `40`
frontends); the children converge via `selfHeal`.

To bootstrap Argo CD on a cluster:

```bash
# prod
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml

# local (k3d)
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application-local.yaml
```

## CI/CD Model

GitHub Actions build, test, and push a multi-arch (`amd64` + `arm64`) image per
component. Every image gets an immutable `sha-<short-commit>` tag (plus `latest`
on `master`), and public base images are pulled through `mirror.gcr.io` to avoid
Docker Hub rate limits. **Only `master` publishes** — `develop` runs are
build-only.

After a successful **master** build, the same workflow **promotes** the image by
committing the `sha-*` tag into the matching
`apps/*/overlays/prod/kustomization.yaml` (via
`deploy/scripts/ci/update-image-tag.sh`). Argo CD's automated sync then rolls the
workload out — no manual tag edits and no in-cluster image poller. (Argo CD Image
Updater was retired: it could not tell `develop` from `master` `sha-*` tags and
hit Docker Hub rate limits.)

See [`deploy/k8s/README.md`](k8s/README.md#image-promotion-gitops) for the
manifest-level detail and [`deploy/docs/CICD.md`](docs/CICD.md) for the pipeline.

## Infrastructure Services

| Service | Where | Purpose |
|---|---|---|
| **MySQL 8.0** | in-cluster | Primary application database |
| **Redis 7** | in-cluster | Caching, sessions, BullMQ queues |
| **MongoDB** | in-cluster | Analytics events |
| **MinIO** | in-cluster | S3-compatible object storage (media + MySQL backups) |
| **NATS** | in-cluster | JetStream event bus for microservices |
| **Keycloak** | in-cluster | Identity and access management |
| **Elasticsearch 8.11** | **external** | Hotel search + log aggregation (Elastic Cloud) |

## External Managed Services

- **Elasticsearch** (search/logs) — Elastic Cloud; connection settings arrive
  through the SOPS-sealed prod secret.
- **Cloudflare Tunnel** — public ingress, plus Cloudflare **Access** in front of
  `argocd.deployserver.work`.
- **Hetzner Volume** — 161 GB block volume mounted at `/mnt/minio` for object
  storage.

## Scripts

`deploy/scripts/` contains:

- `ci/update-image-tag.sh` — rewrites a `newTag` in a kustomization file (used by
  the CI promotion step).
- `secrets/` — SOPS + age key generation and prod/local secret sealing.
- `validate-manifests.sh` — renders every Kustomize target and schema-checks it
  with `kubeconform` (run in the `Validate Deploy Manifests` workflow).
- `setup-hotels-index.sh` — Elasticsearch hotels index setup.
- `build-local-frontend.sh` — build + import the local `travelnest-frontend:local`
  image into k3d.
- `enable-local-edge.sh` — publish host `:80` to the local k3d load balancer.

---

📖 See [`deploy/k8s/README.md`](k8s/README.md), [`deploy/docs/CICD.md`](docs/CICD.md),
[`deploy/docs/SECRETS.md`](docs/SECRETS.md), and the
**[Wiki: Deployment](https://github.com/bk-leducphuong/TravelNest/wiki/Deployment)**
and **[Wiki: CI-CD](https://github.com/bk-leducphuong/TravelNest/wiki/CI-CD)**.
