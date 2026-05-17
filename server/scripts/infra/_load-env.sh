#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$SERVER_DIR/.." && pwd)"

ENV_FILE="${ENV_FILE:-$SERVER_DIR/.env.development}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Create it from server/.env.format or set ENV_FILE=/path/to/env." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

require_cli() {
  local binary="$1"

  if ! command -v "$binary" >/dev/null 2>&1; then
    echo "Required CLI not found: $binary" >&2
    exit 127
  fi
}

trim() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}
