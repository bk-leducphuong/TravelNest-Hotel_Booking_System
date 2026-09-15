#!/usr/bin/env bash
#
# Render every kustomize overlay under deploy/k8s and validate the resulting
# manifests with kubeconform. This is what the deploy-validate CI workflow runs
# so a broken manifest cannot reach Argo CD (which auto-syncs with prune enabled).
#
# Prod overlays use the KSOPS exec generator to decrypt secrets; the age key is
# deliberately never present in CI, so this script makes a throwaway copy of the
# tree and strips the `generators:` blocks before rendering. Everything except
# the encrypted Secret payloads is still validated.
#
# Requirements: kustomize (or kubectl) and kubeconform on PATH. Uses GNU find
# (`-printf`), i.e. intended for Linux/CI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
K8S_DIR="$ROOT/deploy/k8s"

if command -v kustomize >/dev/null 2>&1; then
  render() { kustomize build "$1"; }
elif command -v kubectl >/dev/null 2>&1; then
  render() { kubectl kustomize "$1"; }
else
  echo "ERROR: neither 'kustomize' nor 'kubectl' found on PATH." >&2
  exit 1
fi

if ! command -v kubeconform >/dev/null 2>&1; then
  echo "ERROR: 'kubeconform' not found on PATH." >&2
  echo "Install: https://github.com/yannh/kubeconform/releases" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cp -R "$K8S_DIR" "$tmp/k8s"

# Remove top-level `generators:` blocks (KSOPS) so the overlays render without
# the age private key. Top-level YAML keys start at column 0.
while IFS= read -r file; do
  awk '
    /^generators:[[:space:]]*$/ { skip = 1; next }
    skip && /^[^[:space:]#]/   { skip = 0 }
    skip                       { next }
    { print }
  ' "$file" > "$file.stripped"
  mv "$file.stripped" "$file"
done < <(grep -rl '^generators:' "$tmp/k8s" --include=kustomization.yaml || true)

# Bootstrap manifests (e.g. the KSOPS patch) are applied against a live Argo CD
# install and have no standalone base, so they are excluded.
mapfile -t dirs < <(
  find "$tmp/k8s" -name kustomization.yaml -not -path '*/bootstrap/*' -printf '%h\n' | sort
)

if [ "${#dirs[@]}" -eq 0 ]; then
  echo "No kustomization directories found under $K8S_DIR" >&2
  exit 1
fi

failed=0
for dir in "${dirs[@]}"; do
  rel="${dir#"$tmp/k8s"/}"
  printf '==> %s\n' "$rel"
  if ! render "$dir" > "$tmp/rendered.yaml" 2> "$tmp/render.err"; then
    printf '    kustomize build FAILED\n'
    sed 's/^/    /' "$tmp/render.err"
    failed=1
    continue
  fi
  if ! kubeconform -strict -ignore-missing-schemas -summary "$tmp/rendered.yaml"; then
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo
  echo "Manifest validation FAILED." >&2
  exit 1
fi

# Bootstrap manifests applied by hand (no kustomization wrapper).
shopt -s nullglob
bootstrap_files=("$K8S_DIR"/bootstrap/argocd/image-updater/*.yaml)
if [ "${#bootstrap_files[@]}" -gt 0 ]; then
  printf '==> bootstrap/argocd/image-updater\n'
  if ! kubeconform -strict -ignore-missing-schemas -summary "${bootstrap_files[@]}"; then
    echo
    echo "Manifest validation FAILED." >&2
    exit 1
  fi
fi

echo
echo "All ${#dirs[@]} kustomize targets rendered and validated."
