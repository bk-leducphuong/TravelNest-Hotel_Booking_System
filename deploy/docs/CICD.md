# CI/CD and GitOps

TravelNest uses a split delivery model:

- GitHub Actions builds, tests, and pushes container images.
- Argo CD deploys those images from manifests stored in Git under `deploy/k8s/`.
- The image workflow itself **promotes** the new immutable tag into the prod
  overlays, so Git stays the single source of truth.

## Pipelines

Application image pipelines:

- `.github/workflows/backend.yml` → `travelnest-api` (the `worker` deployment
  reuses this image)
- `.github/workflows/frontend.yml` → `travelnest-frontend`
- `.github/workflows/admin-client.yml` → `travelnest-admin`
- `.github/workflows/superadmin-client.yml` → `travelnest-superadmin`
- `.github/workflows/analytics-service.yml` → `travelnest-analytics`
- `.github/workflows/media-service.yml` → `travelnest-media`
- `.github/workflows/notification-service.yml` → `travelnest-notification`

Plus `.github/workflows/deploy-validate.yml` (**Validate Deploy Manifests**),
which renders every Kustomize target under `deploy/**` and schema-checks it with
`kubeconform`.

## Flow

1. Push/merge to `master` (or dispatch a workflow manually).
2. GitHub Actions runs the component's lint / test / schema-drift checks.
3. It builds a multi-arch (`linux/amd64`, `linux/arm64`) image and pushes it to
   Docker Hub, tagged `sha-<short-commit>` and `latest`. Public base-image pulls
   go through `mirror.gcr.io` to stay under Docker Hub's pull-rate limit.
4. On `master`, the workflow runs `deploy/scripts/ci/update-image-tag.sh` to write
   the `sha-*` tag into `deploy/k8s/apps/<app>/overlays/prod/kustomization.yaml`,
   then commits it (`chore(deploy): promote <app> to sha-<commit>`).
5. Argo CD auto-syncs the commit and rolls the workload out — no manual step.

Only **master** publishes. On `develop` (and on pull requests) the build runs but
the promote step is skipped, so unreleased `develop` images never reach
production. Argo CD Image Updater was retired in favour of this CI-side
write-back: it could not distinguish `develop` from `master` `sha-*` tags and hit
Docker Hub rate limits.

## What Changed

The old SSH-based deployment steps were removed from GitHub Actions. GitHub
Actions no longer:

- SSHes into the VPS
- runs `docker compose pull`
- recreates containers directly
- reloads Nginx directly

Those responsibilities now belong to the Kubernetes control plane, Argo CD, and
the promotion commit.

## Image Naming

Expected image repositories:

- `travelnest-api` (API + worker)
- `travelnest-frontend`
- `travelnest-admin`
- `travelnest-superadmin`
- `travelnest-analytics`
- `travelnest-media`
- `travelnest-notification`

Each workflow pushes a `sha-<short-commit>` tag for every build and `latest` on
the default branch.

## Required Secrets

GitHub Actions requires:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `PROMOTION_TOKEN` — a PAT with `contents: write`, used to push the promotion
  commit to `master` (falls back to the workflow's `GITHUB_TOKEN`).

Cluster runtime secrets are not stored in GitHub Actions. They live in Kubernetes
manifests under `deploy/k8s/`, sealed with SOPS + age and decrypted in-cluster by
KSOPS — see [`SECRETS.md`](SECRETS.md).

## Operational Notes

- A single-node k3s cluster runs MySQL, Redis, MinIO, MongoDB, NATS and Keycloak
  **in-cluster**; only **Elasticsearch** is external (Elastic Cloud).
- Cloudflare Tunnel provides public ingress and is kept outside the cluster for
  simpler recovery.
- Rollbacks are a `git revert` of the promotion commit; Argo CD re-syncs to the
  previous tag.
