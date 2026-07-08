# Deployment

TravelNest has two deployment tracks. The **Kubernetes + Argo CD** path is the active deployment. The **Docker Compose** stack is kept as a rollback reference.

---

## Kubernetes + Argo CD (Active)

### Architecture

```
GitHub Repo ──push──► GitHub Actions ──build & push──► Container Registry
                                                              │
                                                         Argo CD
                                                         (sync)
                                                              │
                                                     ┌────────┴────────┐
                                                     │   k3s Cluster   │
                                                     │   (VPS)         │
                                                     └────────┬────────┘
                                                              │
                                                     ┌────────┴────────┐
                                                     │ Cloudflare      │
                                                     │ Tunnel (ingress)│
                                                     └─────────────────┘
```

### Directory Layout

```
deploy/k8s/
├── apps/                  Application workloads
│   ├── admin-client/      Nuxt 4 admin
│   ├── analytics/         Go analytics service
│   ├── api/               Express API
│   ├── frontend/          Vue 3 user app
│   ├── media/             Go media service
│   ├── notification/      Go notification service
│   └── worker/            BullMQ worker
├── infra/                 Stateful services in cluster
│   ├── keycloak/          
│   ├── minio/             
│   ├── mysql/             
│   ├── nats/              
│   └── redis/             
├── environments/prod/     Production Kustomize overlays
├── bootstrap/argocd/       Argo CD bootstrap
└── components/            Shared Kustomize components
```

### Bootstrap

```bash
# After k3s is installed and Argo CD is deployed:
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml
```

### External Managed Services

- **MongoDB** (analytics)
- **Elasticsearch** (search + logs)
- **Cloudflare Tunnel** (public ingress)

---

## Docker Compose (Legacy)

The old stack is preserved at `deploy/docker/docker-compose.yml`.

**Services**: nginx, api (Node.js), worker (BullMQ), mysql, redis, elasticsearch, kibana, logstash, filebeat, clickhouse, minio

**Usage** (rollback only):

```bash
cd deploy/docker
docker compose up -d
```

---

## Environment Configuration

Environment templates are available for each component:

- `server/.env.format` — API and worker configuration
- `client/.env.format` — Client environment variables
- `admin-client/.env.example` — Admin client environment
- `services/*/.env.format` — Go service environments
- `deploy/docker/.env.template` — Docker Compose environment

---

## Scripts

`deploy/scripts/` includes automation for:

| Script | Purpose |
|---|---|
| `01-install-packages.sh` | System package installation |
| `02-*.sh` through `05-*.sh` | Step-by-step infrastructure setup |
| `setup-all.sh` | Full setup automation |
| `backup-setup.sh` | Backup configuration |
| `health-check.sh` | Service health verification |
| `mysql-backup.sh` | Database backup |
| `toggle-maintenance-mode.sh` | Maintenance mode control |
| `setup-hotels-index.sh` | Elasticsearch hotels index |
| `setup-logs-index.sh` | Elasticsearch logs index |
| `setup-kibana-user.sh` | Kibana user setup |
| `init-clickhouse.sh` | ClickHouse initialization |
| `post-deploy.sh` | Post-deployment tasks |

## Monitoring

- **Kibana**: [kibana.deployserver.work](https://kibana.deployserver.work) — log aggregation and visualization
- **Elasticsearch**: Application and system logs indexed in `logs-*` indices
- **Bull Board**: Queue monitoring at `/admin/queues` on the API server
