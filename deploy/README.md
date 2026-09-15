# TravelNest Deployment & Infrastructure

This directory contains the deployment infrastructure for TravelNest.

## Deployment Tracks

Two deployment paths are maintained:

| Track | Directory | Status |
|---|---|---|
| **Kubernetes + Argo CD** | `deploy/k8s/` | **Active** (current) |
| Docker Compose | `deploy/docker/` | Legacy (rollback reference) |

## Kubernetes GitOps Layout

```
deploy/k8s/
├── apps/                  Application workloads
│   ├── admin-client/      Nuxt 4 admin dashboard
│   ├── analytics/         Go analytics microservice
│   ├── api/               Express API
│   ├── frontend/          Vue 3 user app
│   ├── media/             Go media microservice
│   ├── notification/      Go notification microservice
│   └── worker/            BullMQ worker
├── infra/                 In-cluster stateful services
│   ├── keycloak/          Identity provider
│   ├── minio/             Object storage
│   ├── mysql/             Primary database
│   ├── nats/              Message bus
│   └── redis/             Cache and queues
├── environments/prod/     Environment overlays (Kustomize)
│   └── root/              Root kustomization
├── bootstrap/argocd/      Argo CD bootstrap manifests
└── components/            Shared Kustomize components
```

To bootstrap Argo CD:

```bash
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml
```

## CI/CD Model

GitHub Actions build and push Docker images to a container registry. Argo CD detects changes to manifests in `deploy/k8s/` and syncs them into the cluster.

See [`deploy/docs/CICD.md`](docs/CICD.md) for the full pipeline description.

## Infrastructure Services

| Service | Purpose |
|---|---|
| **MySQL 8.0** | Primary application database |
| **Redis 7** | Caching, sessions, BullMQ queues |
| **Elasticsearch 8.11** | Hotel search + log indexing |
| **MongoDB** | Analytics (search logs, hotel views) |
| **MinIO** | S3-compatible object storage (media) |
| **NATS** | JetStream event bus for microservices |
| **Keycloak** | Identity and access management |

## External Managed Services

- MongoDB (analytics)
- Elasticsearch (search/logs)
- Cloudflare Tunnel (public ingress)

## Legacy Docker Compose

The old Docker Compose stack is preserved at `deploy/docker/docker-compose.yml` for rollback and migration reference.

## Scripts

`deploy/scripts/` contains utility scripts for:

- Infrastructure setup (01-05)
- MySQL backups
- Health checks
- Elasticsearch index setup
- Kibana user setup
- ClickHouse initialization
- Maintenance mode toggling

---

📖 See the **[Wiki: Deployment](https://github.com/bk-leducphuong/TravelNest/wiki/Deployment)** and **[Wiki: CI-CD](https://github.com/bk-leducphuong/TravelNest/wiki/CI-CD)** for more details.
