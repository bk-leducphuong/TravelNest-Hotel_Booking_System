# TravelNest Kubernetes GitOps

This directory contains the Kubernetes and Argo CD deployment manifests for the
current TravelNest microservice architecture.

## Scope

Phase 1 deploys these workloads into a single-node `k3s` cluster:

- `frontend`
- `admin-client`
- `api`
- `worker`
- `analytics`
- `media`
- `notification`
- `mysql`
- `redis`
- `minio`
- `nats`

These stay external and are configured through Kubernetes secrets:

- managed MongoDB
- managed Elasticsearch

## Layout

```text
deploy/k8s/
  bootstrap/argocd/        Argo CD bootstrap (root applications + KSOPS/Image Updater)
  environments/
    base/                  Shared namespace + AppProject (env-agnostic)
    prod/                  Prod root kustomization + ApplicationSet
    local/                 Local root kustomization + ApplicationSet
  apps/                    Application workloads (base + local/prod overlays)
  infra/                   In-cluster stateful services (base + local/prod overlays)
  local/                   Dev-only MongoDB/Elasticsearch + manual maintenance jobs
```

Each cluster bootstraps one **environment root** (`environments/<env>`), which
renders the namespace, the shared `AppProject`, and one `ApplicationSet`. The
application-set controller turns each list element into an `Application`, so the
per-workload manifests live in a single file instead of 12 near-identical ones.

## Bootstrap

1. Install `k3s` and Argo CD on the VPS.
2. Bootstrap SOPS + age and seal the prod secrets, then patch Argo CD for KSOPS
   (see [Secrets](#secrets-sops--age) below).
3. Apply the root Argo CD application for your cluster:

```bash
# prod
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml

# local (k3d)
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application-local.yaml
```

Argo CD then syncs the full stack from this repository.

## Sync ordering

The `ApplicationSet` uses a **list generator**, and the application-set controller
creates the child `Application`s directly. As a result,
`argocd.argoproj.io/sync-wave` on those child Applications is **not honoured** —
all of them sync concurrently and converge via `selfHeal` (workload pods may
briefly restart until MySQL/Redis/Keycloak/servers are ready). The `wave` values
are kept as an `Application` **label** so you can opt into real ordering later.

To enforce infra-before-apps, enable **progressive syncs** on the controller and
switch the ApplicationSet to `RollingSync`:

```bash
# enable progressive syncs (once, cluster-side)
kubectl -n argocd patch configmap argocd-cmd-params-cm --type merge \
  -p '{"data":{"applicationsetcontroller.enable.progressive.syncs":"true"}}'
kubectl -n argocd rollout restart deploy/argocd-applicationset-controller
```

```yaml
# in environments/<env>/applicationset.yaml
spec:
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions: [{key: wave, operator: In, values: ["10"]}]
        - matchExpressions: [{key: wave, operator: In, values: ["20"]}]
        - matchExpressions: [{key: wave, operator: In, values: ["30"]}]
        - matchExpressions: [{key: wave, operator: In, values: ["40"]}]
```

Note: RollingSync is beta and forces auto-sync **off** on the generated
Applications (the controller triggers syncs itself, step by step).

## Important Defaults

- Namespace: `travelnest`
- Ingress controller: `traefik`
- Public hosts:
  - `deployserver.work`
  - `admin.deployserver.work`
  - `api.deployserver.work`
  - `storage.deployserver.work`
- Cloudflare Tunnel stays outside the cluster in phase 1.

## Secrets (SOPS + age)

Prod secrets are managed with SOPS + age and decrypted in-cluster by the KSOPS
kustomize plugin. Plaintext values and the age key never enter git; each prod
overlay commits a `secret.enc.yaml` that Argo CD decrypts at sync time.

The **local** environment (`deploy/k8s/local/**`) uses the same mechanism with
its own values (`deploy/k8s/.env.local`) and its own encrypted files, sealed by
`seal-local-secrets.sh`. The two seal scripts never touch each other's paths.

Full guide: **[../docs/SECRETS.md](../docs/SECRETS.md)**. Short version:

```bash
./deploy/scripts/secrets/init-age-key.sh          # generate key + sops-age Secret
cp deploy/k8s/.env.prod.example deploy/k8s/.env.prod && $EDITOR deploy/k8s/.env.prod
./deploy/scripts/secrets/seal-prod-secrets.sh     # render + encrypt (prod)
./deploy/scripts/secrets/install-argo-ksops.sh    # patch Argo CD repo-server

# Local environment instead:
cp deploy/k8s/.env.local.example deploy/k8s/.env.local && $EDITOR deploy/k8s/.env.local
./deploy/scripts/secrets/seal-local-secrets.sh    # render + encrypt (local)
```

## Image promotion (GitOps)

CI publishes an immutable `sha-<short-commit>` tag for every image (plus a
mutable `latest` on the default branch). Images are promoted to prod by
**Argo CD Image Updater**, which commits the new `sha-*` tag into the matching
`apps/*/overlays/prod/kustomization.yaml`. Argo CD's automated sync then rolls
the workload out — no manual tag edits.

```
CI ──▶ docker.io/leducphuong/<image>:sha-abc1234
          │
   Argo CD Image Updater ──(git commit)──▶ deploy/k8s/.../prod/kustomization.yaml
          │
     Argo CD auto-sync ──▶ rollout
```

Set-up and caveats: **[bootstrap/argocd/image-updater/README.md](bootstrap/argocd/image-updater/README.md)**.

## Manifest validation

Every change under `deploy/**` runs
**[`deploy/scripts/validate-manifests.sh`](../scripts/validate-manifests.sh)**
in the `Validate Deploy Manifests` workflow: it renders all kustomize targets
and checks them with `kubeconform`. Run it locally with `kustomize` and
`kubeconform` on `PATH`:

```bash
./deploy/scripts/validate-manifests.sh
```

## Database migrations

`apps/api/overlays/prod/migration-job.yaml` is an Argo CD **PreSync hook** that
runs `sequelize-cli db:migrate` against the production database before the API
rolls out. It reuses the `api-config` ConfigMap and `api-secret` Secret.

> **First-install caveat:** a PreSync hook runs before the sync creates
> `api-secret`, so on a brand-new cluster make sure the prod secrets exist
> (apply them first) before the very first sync.

## Local environment (k3d)

`deploy/k8s/local/` is a self-contained environment overlay for a local k3d
cluster. It deploys the same workloads as prod plus two dev-only data stores
that stand in for the managed MongoDB/Elasticsearch:

- `local/mongodb/` — single-node MongoDB (`mongodb:27017`).
- `local/elasticsearch/` — single-node Elasticsearch 8.11, security disabled
  (`http://elasticsearch:9200`).

All local Secrets are SOPS-encrypted with their own values — see
[Secrets](#secrets-sops--age) and `deploy/docs/SECRETS.md`.

Local overlays track the CI-built **`develop`** image tag (`latest` is only
produced on `master`), so a fresh `git push` to `develop` yields a pullable
image. The one exception is the **frontend**: Vite inlines the API URL at build
time and the CI image bakes `https://api.deployserver.work` into the bundle, so
the local overlay pins `travelnest-frontend:local` instead. Produce that image
with:

```bash
deploy/scripts/build-local-frontend.sh   # build + k3d image import
```

Bring-up order (after the cluster + Argo CD + KSOPS are installed):

```bash
# 1. Bootstrap the environment via its AppProject + ApplicationSet:
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application-local.yaml
# the ApplicationSet creates the data layer + app Applications; they sync
# concurrently and converge (see "Sync ordering" above)

# 2. Create the base schema, migrate, then seed quick MySQL data.
#    (db-init runs sequelize.sync; the migrations are incremental and assume
#     the base tables already exist.)
kubectl apply -f <(kubectl kustomize deploy/k8s/local/jobs)   # or apply them one at a time
kubectl -n travelnest logs -f job/db-init
kubectl -n travelnest logs -f job/api-migrate
kubectl -n travelnest logs -f job/seed-quick

# 3. Once the api Service and MinIO are up, upload the sample images:
kubectl -n travelnest delete job seed-images 2>/dev/null
kubectl apply -k deploy/k8s/local/jobs
kubectl -n travelnest logs -f job/seed-images
```

The jobs live in `deploy/k8s/local/jobs/` and are deliberately **not** referenced
by the environment root so Argo CD does not re-run migrations/seeds on every sync.
Job specs are immutable — delete a finished Job before re-applying it.

### Reaching the local cluster

k3d publishes the load balancer on host **:8080** only, but every manifest, the
Keycloak realm and the SPA use port-less URLs (`http://travelnest.local`,
`http://keycloak.travelnest.local`, ...). `enable-local-edge.sh` adds a small L4
passthrough container that publishes host **:80** to the k3d load balancer, so
those values work unchanged:

```bash
deploy/scripts/enable-local-edge.sh

# One-time, needs sudo:
sudo tee -a /etc/hosts >/dev/null <<'EOF'
127.0.0.1 travelnest.local api.travelnest.local keycloak.travelnest.local storage.travelnest.local admin.travelnest.local
EOF
```

Then browse to `http://travelnest.local`. The local overlay imports the
`travelnest` Keycloak realm on startup; the realm ships **without users**, so
register one (or run the migration under `server/scripts/keycloak/`) before
logging in. `kubectl port-forward` still works for debugging and bypasses
Traefik entirely.

## Portability (running the same manifests on another cluster)

The overlays are intentionally cluster-agnostic so the same `prod` manifests run
on the VPS k3s cluster or a managed cloud cluster. Assumptions to satisfy on any
new cluster:

- **StorageClass** — `mysql`, `redis`, `nats`, `minio`, `mongodb` and
  `elasticsearch` use `volumeClaimTemplates` with **no `storageClassName`**, so
  the cluster must have a default StorageClass. Don't hardcode one in the
  manifests; set the default on the cluster instead.
- **Ingress class** — every Ingress hardcodes `ingressClassName: traefik`. A
  target cluster must run **Traefik**. If it uses another controller (e.g.
  nginx/ALB), patch the ingress class at that time.
- **TLS / edge** — the Ingresses carry no TLS config; prod assumes **Cloudflare
  Tunnel** terminates TLS in front of the cluster. A cloud cluster must supply
  its own edge (cert-manager or a cloud load balancer).
- **Image promotion** — prod expects **Argo CD Image Updater** (see
  `bootstrap/argocd/image-updater/`) to commit `sha-*` tags. A prod cluster
  without it will stay on the tag currently in the overlay.

## AWS environment (managed data)

`environments/prod` targets a managed AWS data tier: **RDS MySQL**,
**ElastiCache Redis**, and **S3** replace the in-cluster `mysql`, `redis`, and
`minio` workloads, which are intentionally absent from the prod
`ApplicationSet`. Connection settings travel in the SOPS-sealed prod secrets
(see `.env.prod.example`), so the committed manifests stay environment-agnostic.
Terraform provisions the data tier, cluster, and platform add-ons — see
[`../terraform/README.md`](../terraform/README.md).

The `keycloak` database is created by
`infra/keycloak/overlays/prod/db-init-job.yaml` (an Argo CD PreSync hook),
because RDS cannot run the old in-cluster MySQL init ConfigMap.

## Before First Deploy

- Point `MONGODB_URI` and Elasticsearch credentials at your cloud-managed services
  via `deploy/k8s/.env.prod`, then seal them (see above).
- Install Argo CD Image Updater (see above) so image pushes actually deploy.
- If you do not want public MinIO object delivery at `storage.deployserver.work`,
  change `PUBLIC_OBJECT_BASE_URL` and remove or replace the MinIO ingress.
