# TravelNest Kubernetes + Argo CD GitOps Deployment Plan

## Summary

Deploy the new Go + Node.js microservice architecture on a single VPS using k3s and Argo CD. Keep the current public domains and Cloudflare-facing model, but replace Docker Compose deployment with GitOps-managed Kubernetes manifests.

Default choices:

- Cluster: single-node VPS k3s
- GitOps: Argo CD, manifests in this repo under `k8s/`
- State: in-cluster first for learning
- Ingress: keep Cloudflare Tunnel, route to Kubernetes Ingress
- App migration: Node API remains gateway/BFF while Go services are added behind it

Useful technologies:

- k3s for lightweight Kubernetes on a VPS
- Argo CD for GitOps deployment
- Kustomize overlays for environment-specific configuration
- Sealed Secrets first for simple encrypted secrets in Git
- External Secrets Operator later if secrets move to Vault, Doppler, AWS Secrets Manager, or another external provider
- Prometheus, Grafana, and Loki for Kubernetes-native observability

## Key Architecture

Run these workloads in Kubernetes:

- `frontend` Vue static client
- `admin-client` Nuxt-generated static client
- `api` Node.js backend
- `worker` legacy BullMQ worker
- first Go service: `analytics`
- later Go services: `media`, `notifications`, `search`, `catalog`, `booking`, `payments`, `identity`

Run these in-cluster dependencies first:

- MySQL 8
- Redis 7
- MongoDB 7
- NATS JetStream
- MinIO
- Elasticsearch
- ClickHouse, kept only if still needed by existing Node code
- Observability stack, simplified to Grafana + Prometheus + Loki instead of ELK for easier Kubernetes operations

Preserve current DNS:

- `deployserver.work` -> frontend
- `admin.deployserver.work` -> admin
- `api.deployserver.work` -> Node API gateway
- internal Go services stay cluster-only

## GitOps Layout

Create this structure:

```text
k8s/
  bootstrap/
    argocd/
    root-application.yaml
  apps/
    frontend/
    admin-client/
    api/
    worker/
    analytics/
  infra/
    ingress/
    cloudflared/
    nats/
    mysql/
    redis/
    mongodb/
    minio/
    elasticsearch/
    clickhouse/
    observability/
    secrets/
  environments/
    dev/
    staging/
    prod/
```

Use Kustomize overlays:

- `base/` contains shared Kubernetes resources
- `overlays/dev`, `overlays/staging`, and `overlays/prod` set replica counts, resource limits, domains, image tags, and storage sizes

Use Argo CD app-of-apps:

- one root Argo CD `Application`
- one child `Application` per app or infra component
- sync order:
  - namespaces
  - secrets/controllers
  - storage/databases
  - messaging
  - observability
  - app workloads

## CI/CD Changes

Change GitHub Actions from SSH deploy to image build only.

For each service:

- run lint/tests
- build image
- push immutable tag:
  - `master-<short-sha>`
  - `staging-<short-sha>`
  - semver tags for releases
- do not deploy by SSH

Deployment happens by Git:

- update image tag in `k8s/environments/<env>/...`
- Argo CD syncs cluster to Git
- rollback is a Git revert or Argo CD rollback

Add new service workflows:

- `services/analytics/**` builds `travelnest-analytics`
- future services follow the same pattern

## Kubernetes Implementation Details

Use `Deployment` for stateless services:

- frontend
- admin-client
- api
- worker
- Go services

Use `StatefulSet` or Helm chart defaults for:

- MySQL
- MongoDB
- Redis if persistence is enabled
- NATS JetStream
- Elasticsearch
- ClickHouse
- MinIO

Use `PersistentVolumeClaim` with local-path storage from k3s for the first VPS version.

Add probes:

- Node API: `/health`
- worker: existing `:4001/health`
- analytics: `/healthz`
- frontend/admin: HTTP root path
- databases: chart-native readiness checks

Add resource requests/limits for every workload:

- start small for VPS safety
- scale Go services independently later

Use `NetworkPolicy` if the chosen CNI supports it:

- public ingress can reach only frontend, admin, and api
- API can reach databases, NATS, Redis, MinIO, Elasticsearch, ClickHouse
- Go services can reach only their required dependencies

## Ingress And Traffic

Install `cloudflared` in the cluster.

Cloudflare Tunnel routes public hostnames to Kubernetes ingress.

Use one ingress controller, preferably Traefik from k3s initially.

Keep TLS termination at Cloudflare for the first version.

Add cert-manager later only if direct HTTPS ingress is needed.

Routing:

- `deployserver.work` -> `frontend` service
- `admin.deployserver.work` -> `admin-client` service
- `api.deployserver.work` -> `api` service
- Go microservices are not public; Node proxies to them using internal service DNS like `http://analytics.analytics.svc.cluster.local:8081`

## Secrets And Config

Use Kubernetes `Secret` and `ConfigMap` as the immediate baseline.

Store encrypted secrets in Git using Sealed Secrets or External Secrets Operator.

Recommended first choice: Sealed Secrets for VPS simplicity.

Move to External Secrets Operator later if using Vault, Doppler, AWS Secrets Manager, or another external provider.

Required config changes:

- replace Compose hostnames with Kubernetes service names
- add `NATS_URL=nats://nats:4222`
- add `MONGODB_URI=mongodb://mongodb:27017/travelnest_analytics`
- add `ANALYTICS_SERVICE_URL=http://analytics:8081`
- keep existing frontend API URLs pointed at `https://api.deployserver.work`

## Migration Rollout

1. Bootstrap VPS with k3s, kubectl, Helm, and Argo CD.
2. Deploy infrastructure through Argo CD:
   - ingress
   - cloudflared
   - secrets
   - MySQL, Redis, MongoDB, NATS, MinIO
   - Elasticsearch, ClickHouse if still needed
   - observability
3. Deploy current monolith-equivalent workloads:
   - frontend
   - admin-client
   - api
   - worker
4. Restore or migrate data from the Compose VPS volumes/backups into Kubernetes PVC-backed services.
5. Verify the current system works before adding Go services.
6. Deploy NATS JetStream stream `TRAVELNEST_EVENTS` or `TRAVELNEST_ANALYTICS`.
7. Deploy Go analytics service.
8. Update Node API to publish analytics events to NATS.
9. Run BullMQ analytics workers and Go analytics consumers in parallel briefly.
10. Disable only the analytics BullMQ workers after verification.
11. Proxy analytics read APIs from Node to Go when ready.
12. Repeat service extraction order from the existing plan: media, notifications, search, catalog, booking, payments, identity.

## Test Plan

Cluster smoke tests:

- all Argo CD apps are `Synced` and `Healthy`
- all pods become ready after reboot
- PVC data survives pod restart

App smoke tests:

- frontend loads from `deployserver.work`
- admin loads from `admin.deployserver.work`
- API `/health` returns healthy from `api.deployserver.work`
- login, search, and booking flows still work through Node API

Eventing tests:

- publish `analytics.search.performed.v1`
- analytics service consumes from JetStream
- MongoDB document is inserted once
- duplicate event is acked without duplicate write

GitOps tests:

- changing image tag in Git triggers Argo CD sync
- bad rollout fails readiness checks
- rollback by reverting image tag restores previous version

Backup tests:

- MySQL dump restore
- MongoDB dump restore
- MinIO bucket restore
- NATS JetStream volume backup/restore for learning environment

## Assumptions

- First deployment target is a VPS running single-node k3s.
- Stateful services run in Kubernetes first because this is a learning/testing migration.
- Manifests live in the same repository under `k8s/`.
- Cloudflare Tunnel remains the public entrypoint.
- Node API remains the only public backend during migration.
- MongoDB must be added to production Kubernetes because current server code and the analytics service plan both depend on it.
- ClickHouse is kept initially only to avoid breaking current Node behavior; analytics ownership should be clarified later before removing it.
