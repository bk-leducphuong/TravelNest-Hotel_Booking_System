# TravelNest Kubernetes + Argo CD GitOps Deployment Plan

## Summary

Deploy the current TravelNest microservice system to a single-node `k3s` VPS
using Argo CD and GitOps-managed manifests stored under `deploy/k8s/`.

Phase 1 target:

- public apps: `frontend`, `admin-client`, `api`
- internal apps: `worker`, `analytics`, `media`, `notification`
- in-cluster infra: `mysql`, `redis`, `minio`, `nats`
- external managed services: MongoDB, Elasticsearch

## Architecture Decisions

- Keep Cloudflare Tunnel outside the cluster in phase 1.
- Keep Node.js as the public BFF/gateway.
- Keep MongoDB and Elasticsearch cloud-managed rather than rehosting them in-cluster.
- Use Argo CD app-of-apps with one root app and one child app per component.
- Keep one production overlay first; add staging/dev overlays later if needed.

## Current Implementation

Implemented in this repository:

- Argo CD bootstrap manifests:
  - `deploy/k8s/bootstrap/argocd/root-application.yaml` (prod)
  - `deploy/k8s/bootstrap/argocd/root-application-local.yaml` (local k3d)
- environment roots (namespace + AppProject + ApplicationSet):
  - `deploy/k8s/environments/prod/`
  - `deploy/k8s/environments/local/`
- app manifests:
  - `deploy/k8s/apps/`
- infra manifests:
  - `deploy/k8s/infra/`
- GitHub Actions updated to image-build-only workflows

## Required Runtime Configuration

Before first deployment:

- seal prod secrets with SOPS + age and patch Argo CD for KSOPS
  (see `deploy/docs/SECRETS.md`)
- set managed `MONGODB_URI`
- set managed Elasticsearch endpoint and API key
- set SMTP, Stripe, OAuth, MinIO, and internal service tokens
- confirm whether `storage.deployserver.work` is the desired public MinIO object host

## Notes

- The legacy Docker Compose stack has been retired; `deploy/k8s/` is the only deploy path.
- `notification` is the current service name in code and manifests.
- NATS is provisioned with the current stream split used by the codebase:
  - `TRAVELNEST_ANALYTICS`
  - `TRAVELNEST_MEDIA`
  - `TRAVELNEST_EVENTS`
