#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_load-env.sh"

require_cli mongosh

MONGODB_URI_VALUE="${MONGODB_CLI_URI:-${MONGODB_URI:-}}"

if [[ -z "$MONGODB_URI_VALUE" ]]; then
  MONGODB_HOST_VALUE="${MONGODB_CLI_HOST:-${MONGODB_HOST:-localhost}}"
  MONGODB_PORT_VALUE="${MONGODB_CLI_PORT:-${MONGODB_PORT:-27017}}"
  MONGODB_DATABASE_VALUE="${MONGODB_CLI_DATABASE:-${MONGODB_DATABASE:-travelnest_analytics}}"
  MONGODB_URI_VALUE="mongodb://$MONGODB_HOST_VALUE:$MONGODB_PORT_VALUE/$MONGODB_DATABASE_VALUE"
fi

exec mongosh "$MONGODB_URI_VALUE" "$@"
