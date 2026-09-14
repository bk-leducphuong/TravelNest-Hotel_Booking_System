# CI/CD and GitOps

TravelNest now uses a split delivery model:

- GitHub Actions builds, tests, and pushes container images
- Argo CD deploys those images from manifests stored in Git under `deploy/k8s/`

## Pipelines

Application image pipelines:

- `.github/workflows/backend.yml`
- `.github/workflows/frontend.yml`
- `.github/workflows/admin-client.yml`
- `.github/workflows/analytics-service.yml`
- `.github/workflows/media-service.yml`
- `.github/workflows/notification-service.yml`

## Flow

1. Push code to `master`, `develop`, or `staging`.
2. GitHub Actions runs lint/tests for the affected component.
3. GitHub Actions builds and pushes a versioned image to Docker Hub.
4. Update the matching image tag in `deploy/k8s/apps/*/overlays/prod/kustomization.yaml`.
5. Commit that manifest change to Git.
6. Argo CD syncs the cluster to the new desired state.

## What Changed

The old SSH-based deployment steps were removed from GitHub Actions.

That means GitHub Actions no longer:

- SSHes into the VPS
- runs `docker compose pull`
- recreates containers directly
- reloads Nginx directly

Those responsibilities now belong to the Kubernetes control plane and Argo CD.

## Image Naming

Expected image repositories:

- `travelnest-api`
- `travelnest-frontend`
- `travelnest-admin`
- `travelnest-analytics`
- `travelnest-media`
- `travelnest-notification`

Each workflow pushes branch tags, SHA tags, and `latest` on the default branch.

## Required Secrets

GitHub Actions still requires:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

Cluster runtime secrets are not stored in GitHub Actions anymore.
They live in Kubernetes manifests under `deploy/k8s/` and should be replaced
with sealed or externally managed secrets before production use.

## Operational Notes

- Keep Cloudflare Tunnel outside the cluster in phase 1 for simpler recovery.
- Managed MongoDB and Elasticsearch credentials must be updated in the Kubernetes
  secrets before the first Argo CD sync.
- If you want immutable rollouts, update `newTag` in the Kustomize overlays to
  commit-specific tags instead of leaving `latest`.
