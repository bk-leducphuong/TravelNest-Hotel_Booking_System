#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_load-env.sh"

require_cli mc

MINIO_SCHEME="http"
if [[ "${MINIO_USE_SSL:-false}" == "true" ]]; then
  MINIO_SCHEME="https"
fi

MINIO_ALIAS_VALUE="${MINIO_CLI_ALIAS:-travelnest}"
MINIO_ENDPOINT_VALUE="${MINIO_CLI_ENDPOINT:-${MINIO_ENDPOINT:-localhost}}"
MINIO_PORT_VALUE="${MINIO_CLI_PORT:-${MINIO_PORT:-9000}}"
MINIO_ACCESS_KEY_VALUE="${MINIO_CLI_ACCESS_KEY:-${MINIO_ACCESS_KEY:-minioadmin}}"
MINIO_SECRET_KEY_VALUE="${MINIO_CLI_SECRET_KEY:-${MINIO_SECRET_KEY:-minioadmin123}}"
MINIO_BUCKET_VALUE="${MINIO_CLI_BUCKET:-${MINIO_BUCKET:-uploads}}"
MINIO_CONFIG_DIR_VALUE="${MINIO_MC_CONFIG_DIR:-$SERVER_DIR/.tmp/mc}"
MINIO_URL="$MINIO_SCHEME://$MINIO_ENDPOINT_VALUE:$MINIO_PORT_VALUE"

mkdir -p "$MINIO_CONFIG_DIR_VALUE"

mc --config-dir "$MINIO_CONFIG_DIR_VALUE" alias set "$MINIO_ALIAS_VALUE" "$MINIO_URL" "$MINIO_ACCESS_KEY_VALUE" "$MINIO_SECRET_KEY_VALUE" >/dev/null

if [[ "$#" -eq 0 ]]; then
  exec mc --config-dir "$MINIO_CONFIG_DIR_VALUE" ls "$MINIO_ALIAS_VALUE/$MINIO_BUCKET_VALUE"
fi

exec mc --config-dir "$MINIO_CONFIG_DIR_VALUE" "$@"
