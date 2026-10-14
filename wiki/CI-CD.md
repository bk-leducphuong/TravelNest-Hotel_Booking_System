# CI/CD Pipeline

TravelNest uses **GitHub Actions** for CI/CD. Seven workflows build and push
container images, and one validates the deployment manifests.

---

## Workflows

| Workflow | File | Triggers | Description |
|---|---|---|---|
| **Backend Image CI** | `backend.yml` | `server/**` changes | Lint, arch/schema checks, tests (advisory), security scan, build & push `travelnest-api` (also used by `worker`) |
| **Frontend Image CI** | `frontend.yml` | `client/**` changes | Lint, build, validate preview, build & push `travelnest-frontend` |
| **Admin Client CI** | `admin-client.yml` | `admin-client/**` changes | Lint, build, build & push `travelnest-admin` |
| **Superadmin Client CI** | `superadmin-client.yml` | `superadmin-client/**` changes | Lint, build, build & push `travelnest-superadmin` |
| **Analytics Service CI** | `analytics-service.yml` | `services/analytics/**` changes | Go lint, test, build & push `travelnest-analytics` |
| **Media Service CI** | `media-service.yml` | `services/media/**` changes | Go lint, test, build & push `travelnest-media` |
| **Notification Service CI** | `notification-service.yml` | `services/notification/**` changes | Go lint, test, build & push `travelnest-notification` |
| **Validate Deploy Manifests** | `deploy-validate.yml` | `deploy/**` changes | Render every Kustomize overlay and schema-check with `kubeconform` |

## CI/CD Flow

```
Developer merges to master ──► GitHub Actions triggered
                                    │
                          ┌─────────┴─────────┐
                          │  Lint & Test       │
                          │  (+ schema drift)  │
                          └─────────┬─────────┘
                                    │ pass
                          ┌─────────┴─────────┐
                          │  Build & Push      │
                          │  multi-arch image  │
                          │  sha-<commit>      │
                          └─────────┬─────────┘
                                    │ same job
                          ┌─────────┴─────────┐
                          │  Promote tag into  │
                          │  prod kustomization│
                          │  (Git commit)      │
                          └─────────┬─────────┘
                                    │ auto-sync
                          ┌─────────┴─────────┐
                          │  Argo CD rolls the │
                          │  workload on k3s   │
                          └───────────────────┘
```

## Branch Strategy

| Branch | CI Action | Deploy |
|---|---|---|
| `master` | Full CI pipeline + image publish | **Auto-deploy** — the promote step writes the `sha-*` tag and Argo CD syncs it |
| `develop` | Full CI pipeline (build only) | None — `develop` images are not published |
| `staging` | Full CI pipeline (build only) | None (kept for compatibility; not used) |
| Feature branches | PR checks | None |

Only **master** publishes images, so unreleased code from other branches can never
reach production.

## Badges

Add these to your README or wiki pages:

```markdown
[![Backend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/backend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/frontend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/frontend.yml)
[![Admin Client CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/admin-client.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/admin-client.yml)
```

## Deployment Model

GitHub Actions **builds, tests, and pushes images**; Argo CD performs the actual
deployment from the manifests under `deploy/k8s/`. The link between the two is the
**promotion commit**: after a successful `master` build, the workflow runs
`deploy/scripts/ci/update-image-tag.sh` to write the immutable `sha-<short-commit>`
tag into the app's `overlays/prod/kustomization.yaml`, commits it, and pushes to
`master`. Argo CD's automated sync then rolls the workload out.

This GitOps model means:

- No direct SSH access needed for deployments
- Full audit trail (every deploy is a git commit)
- Easy rollback (revert the promotion commit)
- Consistent, declarative environments
- No in-cluster image poller — Argo CD Image Updater was retired because it could
  not distinguish `develop` from `master` `sha-*` tags and hit Docker Hub rate
  limits.

See also: **[Deployment](Deployment)** and
[`deploy/k8s/README.md`](https://github.com/bk-leducphuong/TravelNest/blob/master/deploy/k8s/README.md).
