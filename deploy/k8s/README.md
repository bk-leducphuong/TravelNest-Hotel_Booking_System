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
2. Update image names and placeholder secrets in the `overlays/prod` manifests.
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

## Before First Deploy

- Replace all `${VAR}` placeholders in app and infra secrets with `envsubst` or your
  preferred secret templating step before applying manifests.
- Replace `docker.io/your-dockerhub-user/...` image names in each prod overlay.
- Point `MONGODB_URI` and Elasticsearch credentials at your cloud-managed services.
- If you do not want public MinIO object delivery at `storage.deployserver.work`,
  change `PUBLIC_OBJECT_BASE_URL` and remove or replace the MinIO ingress.
