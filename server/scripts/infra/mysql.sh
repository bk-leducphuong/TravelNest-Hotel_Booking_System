#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_load-env.sh"

require_cli mysql

MYSQL_HOST="${MYSQL_CLI_HOST:-${DB_HOST:-localhost}}"
MYSQL_PORT="${MYSQL_CLI_PORT:-${DB_PORT:-3307}}"
MYSQL_USER="${MYSQL_CLI_USER:-${DB_USER:-root}}"
MYSQL_PASSWORD_VALUE="${MYSQL_CLI_PASSWORD:-${DB_PASSWORD:-}}"
MYSQL_DATABASE="${MYSQL_CLI_DATABASE:-${DB_NAME:-}}"

mysql_args=(--protocol=tcp -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER")

if [[ -n "$MYSQL_DATABASE" ]]; then
  mysql_args+=("$MYSQL_DATABASE")
fi

MYSQL_PWD="$MYSQL_PASSWORD_VALUE" exec mysql "${mysql_args[@]}" "$@"
