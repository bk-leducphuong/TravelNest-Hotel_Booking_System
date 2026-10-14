# Deployment

TravelNest deploys with **Kubernetes + Argo CD GitOps**. Manifests live in
`deploy/k8s/`; Argo CD auto-syncs them. The legacy Docker Compose stack has been
retired. A single **production** environment runs on a Hetzner VPS — there is no
separate staging cluster.

---

## Architecture

```
GitHub Repo ──push──► GitHub Actions ──build & push──► Docker Hub
      ▲                        │
      │  promote sha-* tag     │  CI commits the tag into
      │  commit                ▼  apps/*/overlays/prod/kustomization.yaml
      └──────────────────────────────────────────────┐
                                                     │ auto-sync
                                           ┌─────────┴─────────┐
                                           │      Argo CD      │
                                           └─────────┬─────────┘
                                                     │
                                           ┌─────────┴─────────┐
                                           │    k3s Cluster    │
                                           │  (Hetzner VPS,    │
                                           │   ARM64)          │
                                           └─────────┬─────────┘
                                                     │
                                           ┌─────────┴─────────┐
                                           │ Cloudflare Tunnel │
                                           │ (ingress + Access)│
                                           └───────────────────┘
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
│   ├── superadmin-client/ Nuxt 4 superadmin console
│   └── worker/            BullMQ worker
├── infra/                 Stateful services in cluster
│   ├── keycloak/
│   ├── minio/
│   ├── mongodb/
│   ├── mysql/             (+ prod backup CronJob)
│   ├── nats/
│   └── redis/
├── environments/          One root per cluster
│   ├── base/              Shared namespace + AppProject
│   ├── prod/              Prod root kustomization + ApplicationSet
│   └── local/             Local root kustomization + ApplicationSet
├── monitoring/            Grafana Cloud (Alloy) monitoring
├── local/                 Dev-only MongoDB/Elasticsearch + manual jobs
└── bootstrap/argocd/      Argo CD bootstrap (+ KSOPS)
```

## Environments

Each cluster applies **one environment root** (`deploy/k8s/environments/<env>`).
The root renders the namespace, the shared `AppProject`, and a single
`ApplicationSet`; the application-set controller expands it into one
`Application` per workload, labelled by sync-wave (`10` infra → `20` services →
`30` api/worker → `40` frontends). Local and prod use the identical mechanism.
The children sync concurrently and converge via `selfHeal`; for guaranteed
ordering, see the opt-in RollingSync recipe in
[`deploy/k8s/README.md`](https://github.com/bk-leducphuong/TravelNest/blob/master/deploy/k8s/README.md).

## Bootstrap

```bash
# prod
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml

# local (k3d)
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application-local.yaml
```

## Image Promotion (GitOps)

CI publishes an immutable `sha-<short-commit>` tag for every image (plus `latest`
on `master`). After a successful **master** build, the workflow commits that tag
into the matching `apps/*/overlays/prod/kustomization.yaml` via
`deploy/scripts/ci/update-image-tag.sh`; Argo CD's automated sync then rolls the
workload out.

```
master push ─▶ docker.io/leducphuong/<image>:sha-abc1234
                  │  same job commits the tag
                  ▼
      deploy/k8s/apps/<app>/overlays/prod/kustomization.yaml
                  │ auto-sync
                  ▼
              rollout
```

Only **master** publishes, so unreleased `develop` images can never reach prod.
Argo CD Image Updater was retired in favour of this CI-side write-back (it could
not distinguish `develop` from `master` tags and hit Docker Hub rate limits).

## External Managed Services

- **Elasticsearch** (search/logs) — Elastic Cloud
- **Cloudflare Tunnel** (public ingress, plus Access in front of Argo CD)

Everything else — MySQL, Redis, MinIO, MongoDB, NATS, Keycloak — runs in-cluster.

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
| `ci/update-image-tag.sh` | Rewrite a `newTag` in a kustomization (CI promotion) |
| `secrets/` | SOPS + age key generation and prod/local secret sealing |
| `validate-manifests.sh` | Render every Kustomize target and schema-check it |
| `setup-hotels-index.sh` | Elasticsearch hotels index |
| `build-local-frontend.sh` | Build + import the local k3d frontend image |
| `enable-local-edge.sh` | Publish host `:80` to the local k3d load balancer |

## Monitoring

- **Grafana Cloud** — Kubernetes + host metrics via **Grafana Alloy**
  (`deploy/k8s/monitoring/`), with alert rules under `monitoring/alerts/`.
- **Bull Board** — Queue monitoring at `/admin/queues` on the API server.
