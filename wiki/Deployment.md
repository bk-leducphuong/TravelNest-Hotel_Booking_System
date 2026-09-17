# Deployment

TravelNest deploys with **Kubernetes + Argo CD GitOps**. Manifests live in
`deploy/k8s/`; Argo CD auto-syncs them. The legacy Docker Compose stack has been
retired.

---

## Architecture

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

## Directory Layout

```
deploy/k8s/
├── apps/                  Application workloads (base + local/prod overlays)
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
│   ├── mysql/             (+ prod backup CronJob)
│   ├── nats/
│   └── redis/
├── environments/          One root per cluster
│   ├── base/              Shared namespace + AppProject
│   ├── prod/              Prod root kustomization + ApplicationSet
│   └── local/             Local root kustomization + ApplicationSet
├── local/                 Dev-only MongoDB/Elasticsearch + manual jobs
└── bootstrap/argocd/      Argo CD bootstrap
```

## Environments

Each cluster applies **one environment root** (`deploy/k8s/environments/<env>`).
The root renders the namespace, the shared `AppProject`, and a single
`ApplicationSet`; the application-set controller expands it into one
`Application` per workload, ordered by sync-wave (`10` infra → `20` services →
`30` api/worker → `40` frontends). Local and prod use the identical mechanism.

## Bootstrap

```bash
# prod
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml

# local (k3d)
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application-local.yaml
```

## External Managed Services

- **MongoDB** (analytics)
- **Elasticsearch** (search)
- **Cloudflare Tunnel** (public ingress)

---

## Environment Configuration

Environment templates are available for each component:

- `server/.env.format` — API and worker configuration
- `client/.env.format` — Client environment variables
- `admin-client/.env.example` — Admin client environment
- `services/*/.env.format` — Go service environments

Cluster configuration is passed through Kustomize ConfigMaps and SOPS-encrypted
Secrets — see [`deploy/docs/SECRETS.md`](../deploy/docs/SECRETS.md).

---

## Scripts

`deploy/scripts/` includes:

| Script | Purpose |
|---|---|
| `secrets/` | SOPS + age key generation and prod/local secret sealing |
| `validate-manifests.sh` | Render every Kustomize target and schema-check it |
| `setup-hotels-index.sh` | Elasticsearch hotels index |

## Monitoring

- **Bull Board**: Queue monitoring at `/admin/queues` on the API server
