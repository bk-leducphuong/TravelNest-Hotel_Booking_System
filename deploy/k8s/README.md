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
  bootstrap/argocd/
  argocd/
  apps/
  infra/
  environments/prod/root/
```

## Bootstrap

1. Install `k3s` and Argo CD on the VPS.
2. Bootstrap SOPS + age and seal the prod secrets, then patch Argo CD for KSOPS
   (see [Secrets](#secrets-sops--age) below).
3. Apply the root Argo CD application:

```bash
kubectl apply -n argocd -f deploy/k8s/bootstrap/argocd/root-application.yaml
```

Argo CD then syncs the full stack from this repository.

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

Full guide: **[../docs/SECRETS.md](../docs/SECRETS.md)**. Short version:

```bash
./deploy/scripts/secrets/init-age-key.sh          # generate key + sops-age Secret
cp deploy/k8s/.env.prod.example deploy/k8s/.env.prod && $EDITOR deploy/k8s/.env.prod
./deploy/scripts/secrets/seal-prod-secrets.sh     # render + encrypt
./deploy/scripts/secrets/install-argo-ksops.sh    # patch Argo CD repo-server
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

## Before First Deploy

- Point `MONGODB_URI` and Elasticsearch credentials at your cloud-managed services
  via `deploy/k8s/.env.prod`, then seal them (see above).
- Install Argo CD Image Updater (see above) so image pushes actually deploy.
- If you do not want public MinIO object delivery at `storage.deployserver.work`,
  change `PUBLIC_OBJECT_BASE_URL` and remove or replace the MinIO ingress.
