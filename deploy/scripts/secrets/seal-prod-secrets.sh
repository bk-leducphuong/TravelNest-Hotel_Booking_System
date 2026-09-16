#!/usr/bin/env bash
#
# Render every deploy/k8s/**/secret.template.yaml with values from
# deploy/k8s/.env.prod and write a SOPS-encrypted secret.enc.yaml next to it.
#
# The encrypted files are safe to commit (public repo). Argo CD decrypts them
# at sync time through the KSOPS plugin + the sops-age cluster Secret.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="${1:-$ROOT/deploy/k8s/.env.prod}"
KEY_FILE="$ROOT/deploy/k8s/.age/keys.txt"

for bin in sops age-keygen envsubst; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "ERROR: '$bin' not found. sops: https://github.com/getsops/sops/releases, age: https://github.com/FiloSottile/age#installation, envsubst: apt install gettext-base" >&2
    exit 1
  fi
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: env file not found: $ENV_FILE" >&2
  echo "Copy deploy/k8s/.env.prod.example and fill it in." >&2
  exit 1
fi

if [[ ! -f "$KEY_FILE" ]]; then
  echo "ERROR: age key not found: $KEY_FILE" >&2
  echo "Run deploy/scripts/secrets/init-age-key.sh first." >&2
  exit 1
fi

PUBLIC_KEY="$(age-keygen -y "$KEY_FILE")"

# sops matches creation rules against the *input* file path. The rendered file
# lives in a temp dir, so hand sops an explicit catch-all config instead of
# relying on the repo-root .sops.yaml (which is kept for manual/editor use).
SOPS_CONFIG="$(mktemp)"
trap 'rm -f "$SOPS_CONFIG"' EXIT
cat > "$SOPS_CONFIG" <<EOF
creation_rules:
  - path_regex: '.'
    encrypted_regex: '^(data|stringData)\$'
    age: $PUBLIC_KEY
EOF

# Load the plaintext values into the environment without shell evaluation, so
# values containing spaces or special characters (e.g. a PEM) survive intact.
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" != *=* ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  # trim surrounding whitespace and one layer of optional quotes
  key="${key#"${key%%[![:space:]]*}"}"; key="${key%"${key##*[![:space:]]}"}"
  value="${value#"${value%%[![:space:]]*}"}"; value="${value%"${value##*[![:space:]]}"}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  export "$key=$value"
done < "$ENV_FILE"

fail=0
while IFS= read -r template; do
  dir="$(dirname "$template")"
  enc="$dir/secret.enc.yaml"

  # Collect the ${VARS} this template needs.
  mapfile -t vars < <(grep -oE '\$\{[A-Za-z0-9_]+\}' "$template" | tr -d '${}' | sort -u)

  missing=()
  for v in "${vars[@]}"; do
    if [[ -z "${!v+x}" ]]; then
      missing+=("$v")
    fi
  done
  if (( ${#missing[@]} )); then
    echo "ERROR: $template references variables missing from $ENV_FILE: ${missing[*]}" >&2
    fail=1
    continue
  fi

  # Substitute only the variables this template declares, so values containing
  # '$' are never re-expanded.
  subst_list="$(printf '${%s} ' "${vars[@]}")"
  rendered="$(mktemp)"
  envsubst "$subst_list" < "$template" > "$rendered"

  if grep -qE '\$\{[A-Za-z0-9_]+\}' "$rendered"; then
    echo "ERROR: unresolved placeholders remain after rendering $template" >&2
    rm -f "$rendered"
    fail=1
    continue
  fi

  tmp_enc="$(mktemp)"
  if sops --encrypt --config "$SOPS_CONFIG" \
    --input-type yaml --output-type yaml \
    "$rendered" > "$tmp_enc"; then
    mv "$tmp_enc" "$enc"
    echo "sealed $enc"
  else
    rm -f "$tmp_enc"
    echo "ERROR: sops failed to encrypt $template" >&2
    fail=1
  fi
  rm -f "$rendered"
done < <(find "$ROOT/deploy/k8s" -name secret.template.yaml | sort)

if (( fail )); then
  echo "One or more templates failed. Nothing was partially written for those." >&2
  exit 1
fi

echo
echo "Done. Commit the generated secret.enc.yaml files."
echo "Verify locally with: sops --decrypt <file>"
