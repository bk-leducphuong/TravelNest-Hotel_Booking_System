# Argo CD Image Updater

This is the piece that makes the pipeline actually GitOps: CI publishes an
immutable `sha-<short-commit>` image tag, and Image Updater commits that tag
back into the matching `deploy/k8s/apps/*/overlays/prod/kustomization.yaml`
file. Argo CD's automated sync then rolls the workload out. Nothing is edited
by hand and every deploy is a revertible Git commit.

```
CI push ──▶ docker.io/leducphuong/<image>:sha-abc1234
                │
                ▼
        Argo CD Image Updater  ──(git commit)──▶  deploy/k8s/.../prod/kustomization.yaml
                                                        │
                                                        ▼
                                                  Argo CD auto-sync
```

## Prerequisites

- Argo CD installed in the `argocd` namespace (see `../ksops/` and
  `../../README.md`).
- A Git credential with **write** access to this repository. Image Updater
  reuses Argo CD's repository credentials by default; if the Argo CD repo
  credential is read-only (or the repo is public and unauthenticated), create a
  dedicated secret instead:

  ```bash
  kubectl -n argocd create secret generic image-updater-git-creds \
    --from-literal=username=<github-user> \
    --from-literal=password=<personal-access-token-with-repo-scope>
  ```

  Then change `writeBackConfig.method` in `imageupdater.yaml` from `git` to
  `git:secret:image-updater-git-creds`.

## Install

```bash
# 1. Install the controller (namespace-scoped; watches its own namespace).
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/config/install.yaml

# 2. Apply the TravelNest configuration and CR.
kubectl apply -f deploy/k8s/bootstrap/argocd/image-updater/
```

## Verify

```bash
kubectl -n argocd get imageupdater travelnest -o yaml
kubectl -n argocd logs deploy/argocd-image-updater-controller --tail=100
```

A successful update produces a commit authored by `argocd-image-updater`:

```
chore(deploy): update travelnest-api image

updates image docker.io/leducphuong/travelnest-api tag 'latest' to 'sha-abc1234'
```

## Notes and caveats

- **Immutable tags only.** `commonUpdateSettings.allowTags` restricts updates to
  `^sha-[0-9a-f]{7}$`, the tag format produced by `docker/metadata-action`
  (`type=sha,prefix=sha-,format=short`). Branch/`latest` tags are ignored.
- **Docker Hub rate limits.** The `newest-build` strategy lists manifests, which
  counts against Docker Hub pull limits. Authenticate the registry (see the
  upstream docs) or switch to `alphabetical` if this becomes a problem.
- **Branch protection.** Writing back straight to `master` requires that direct
  pushes are allowed. If `master` is protected, use the pull-request write-back
  mode instead (`gitConfig.pullRequest.github` in the upstream docs) so each
  image promotion goes through review.
- **First run.** Before Image Updater has run, the overlays still contain
  `newTag: latest`. The first successful update rewrites them to a `sha-*` tag.
- **Rollback.** `git revert` the Image Updater commit; Argo CD re-syncs the
  previous immutable tag.
