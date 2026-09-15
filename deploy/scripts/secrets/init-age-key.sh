#!/usr/bin/env bash
#
# One-time bootstrap for SOPS + age secret management.
#
#   - generates an age key pair (private key stays out of git)
#   - writes the public key into the repo-root .sops.yaml
#   - registers the private key as the `sops-age` Secret used by Argo CD
#
# Run it once per environment/machine that needs to encrypt or decrypt.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
AGE_DIR="$ROOT/deploy/k8s/.age"
KEY_FILE="$AGE_DIR/keys.txt"
SOPS_YAML="$ROOT/.sops.yaml"
ARGOCD_NS="${ARGOCD_NS:-argocd}"

if ! command -v age-keygen >/dev/null 2>&1; then
  echo "ERROR: age-keygen not found. Install age: https://github.com/FiloSottile/age#installation" >&2
  exit 1
fi

mkdir -p "$AGE_DIR"

if [[ -f "$KEY_FILE" ]]; then
  echo "Using existing age key: $KEY_FILE"
else
  age-keygen -o "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "Generated new age key: $KEY_FILE"
fi

PUBLIC_KEY="$(age-keygen -y "$KEY_FILE")"

cat > "$SOPS_YAML" <<EOF
# SOPS creation rules for TravelNest.
#
# The age recipient below is written by
# deploy/scripts/secrets/init-age-key.sh.
creation_rules:
  - path_regex: deploy/k8s/.*\\.enc\\.yaml\$
    # Only encrypt the values, so secret names/types stay reviewable in diffs.
    encrypted_regex: '^(data|stringData)\$'
    age: $PUBLIC_KEY
EOF

echo
echo "Public recipient : $PUBLIC_KEY"
echo "Private key file : $KEY_FILE  (gitignored - BACK THIS UP)"
echo "Wrote            : $SOPS_YAML"
echo

if kubectl cluster-info >/dev/null 2>&1; then
  kubectl create secret generic sops-age -n "$ARGOCD_NS" \
    --from-file=keys.txt="$KEY_FILE" \
    --dry-run=client -o yaml | kubectl apply -f -
  echo "Applied Secret sops-age in namespace $ARGOCD_NS."
else
  echo "No reachable cluster; skipping the sops-age Secret."
  echo "Create it after Argo CD is installed with:"
  echo "  kubectl create secret generic sops-age -n $ARGOCD_NS --from-file=keys.txt=$KEY_FILE"
fi

echo
echo "NEXT: copy deploy/k8s/.env.prod.example to deploy/k8s/.env.prod and fill in real values,"
echo "then run deploy/scripts/secrets/seal-prod-secrets.sh"
