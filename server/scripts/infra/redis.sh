#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_load-env.sh"

require_cli redis-cli

REDIS_CLI_HOST_VALUE="${REDIS_CLI_HOST:-${REDIS_HOST:-localhost}}"
REDIS_CLI_PORT_VALUE="${REDIS_CLI_PORT:-${REDIS_PORT:-6379}}"
REDIS_CLI_DB_VALUE="${REDIS_CLI_DB:-${REDIS_DB:-${REDIS_DATABASE:-1}}}"
REDIS_CLI_USERNAME_VALUE="$(trim "${REDIS_CLI_USERNAME:-${REDIS_USERNAME:-}}")"
REDIS_CLI_PASSWORD_VALUE="$(trim "${REDIS_CLI_PASSWORD:-${REDIS_PASSWORD:-}}")"

redis_args=(-h "$REDIS_CLI_HOST_VALUE" -p "$REDIS_CLI_PORT_VALUE" -n "$REDIS_CLI_DB_VALUE")

if [[ -n "$REDIS_CLI_USERNAME_VALUE" ]]; then
  redis_args+=(--user "$REDIS_CLI_USERNAME_VALUE")
fi

if [[ -n "$REDIS_CLI_PASSWORD_VALUE" ]]; then
  redis_args+=(-a "$REDIS_CLI_PASSWORD_VALUE")
fi

exec redis-cli "${redis_args[@]}" "$@"
