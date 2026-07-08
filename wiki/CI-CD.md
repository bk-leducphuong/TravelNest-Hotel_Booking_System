# CI/CD Pipeline

TravelNest uses **GitHub Actions** for CI/CD. Six workflows build, test, and deploy the application.

---

## Workflows

| Workflow | File | Triggers | Description |
|---|---|---|---|
| **Backend Image CI** | `backend.yml` | `server/**` changes | Lint, test (unit + integration), security scan, build & push Docker image |
| **Frontend Image CI** | `frontend.yml` | `client/**` changes | Lint, build, validate preview, build & push Docker image |
| **Admin Client CI** | `admin-client.yml` | `admin-client/**` changes | Lint, build, build & push Docker image |
| **Analytics Service CI** | `analytics-service.yml` | `services/analytics/**` changes | Go lint, test, build & push Docker image |
| **Media Service CI** | `media-service.yml` | `services/media/**` changes | Go lint, test, build & push Docker image |
| **Notification Service CI** | `notification-service.yml` | `services/notification/**` changes | Go lint, test, build & push Docker image |

## CI/CD Flow

```
Developer pushes code ──► GitHub Actions triggered
                              │
                    ┌─────────┴─────────┐
                    │  Lint & Test       │
                    │  (all packages)    │
                    └─────────┬─────────┘
                              │ pass
                    ┌─────────┴─────────┐
                    │  Build & Push      │
                    │  Docker Image      │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Argo CD detects   │
                    │  manifest change   │
                    └─────────┬─────────┘
                              │ sync
                    ┌─────────┴─────────┐
                    │  Deploy to k3s    │
                    │  cluster          │
                    └───────────────────┘
```

## Branch Strategy

| Branch | CI Action | Deploy |
|---|---|---|
| `master` | Full CI pipeline | Auto-deploy via Argo CD |
| `develop` | Full CI pipeline | Deploys to staging |
| `staging` | Full CI pipeline | Deploys to staging |
| Feature branches | PR checks | None |

## Badges

Add these to your README or wiki pages:

```markdown
[![Backend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/backend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/frontend.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/frontend.yml)
[![Admin Client CI](https://github.com/bk-leducphuong/TravelNest/actions/workflows/admin-client.yml/badge.svg)](https://github.com/bk-leducphuong/TravelNest/actions/workflows/admin-client.yml)
```

## Deployment Model

GitHub Actions **only builds and pushes Docker images**. Actual deployment is driven by **Argo CD** which monitors the `deploy/k8s/` directory in the repository and auto-syncs changes to the cluster.

This GitOps model means:
- No direct SSH access needed for deployments
- Full audit trail (every change is a git commit)
- Easy rollback (revert the git commit)
- Consistent environments
