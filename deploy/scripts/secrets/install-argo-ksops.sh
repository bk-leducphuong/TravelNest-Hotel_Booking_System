#!/usr/bin/env bash
#
# Patch an existing Argo CD install so its repo-server can decrypt
# *.enc.yaml files with KSOPS.
#
# Run this AFTER Argo CD is installed (e.g. after
# `kubectl apply -n argocd -f .../manifests/install.yaml`) and AFTER
# deploy/scripts/secrets/init-age-key.sh has created the `sops-age` Secret.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DIR="$ROOT/deploy/k8s/bootstrap/argocd/ksops"
ARGOCD_NS="${ARGOCD_NS:-argocd}"

if ! kubectl -n "$ARGOCD_NS" get deployment argocd-repo-server >/dev/null 2>&1; then
  echo "ERROR: argocd-repo-server not found in namespace '$ARGOCD_NS'." >&2
  echo "Install Argo CD first, or set ARGOCD_NS to the correct namespace." >&2
  exit 1
fi

if ! kubectl -n "$ARGOCD_NS" get secret sops-age >/dev/null 2>&1; then
  echo "WARNING: Secret 'sops-age' not found in '$ARGOCD_NS'." >&2
  echo "The repo-server will fail to decrypt secrets until you create it:" >&2
  echo "  deploy/scripts/secrets/init-age-key.sh" >&2
fi

kubectl apply -f "$DIR/argocd-cm-patch.yaml"
# argocd-repo-server-patch.yaml is a *partial* strategic-merge patch, so it must
# be applied with `kubectl patch` — `kubectl apply` rejects it as an incomplete
# Deployment (missing selector/image).
kubectl -n "$ARGOCD_NS" patch deployment argocd-repo-server \
  --type=strategic --patch-file "$DIR/argocd-repo-server-patch.yaml"

echo
echo "Waiting for the repo-server rollout..."
kubectl -n "$ARGOCD_NS" rollout status deployment/argocd-repo-server

echo
echo "Done. The repo-server now has KSOPS + the age key."
