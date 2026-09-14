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

## Before First Deploy

- Point `MONGODB_URI` and Elasticsearch credentials at your cloud-managed services
  via `deploy/k8s/.env.prod`, then seal them (see above).
- If you do not want public MinIO object delivery at `storage.deployserver.work`,
  change `PUBLIC_OBJECT_BASE_URL` and remove or replace the MinIO ingress.
