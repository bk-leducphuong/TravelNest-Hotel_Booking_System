#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/_load-env.sh"

require_cli curl

ES_BASE_URL="${ELASTICSEARCH_CLI_URL:-${ELASTICSEARCH_HOSTS:-http://localhost:9200}}"
ES_BASE_URL="${ES_BASE_URL%%,*}"
ES_BASE_URL="${ES_BASE_URL%/}"
ES_USERNAME_VALUE="$(trim "${ELASTICSEARCH_CLI_USERNAME:-${ELASTICSEARCH_USERNAME:-}}")"
ES_PASSWORD_VALUE="$(trim "${ELASTICSEARCH_CLI_PASSWORD:-${ELASTICSEARCH_PASSWORD:-}}")"

path="${1:-_cluster/health?pretty}"
if [[ "$#" -gt 0 ]]; then
  shift
fi

if [[ "$path" == http://* || "$path" == https://* ]]; then
  url="$path"
else
  path="${path#/}"
  url="$ES_BASE_URL/$path"
fi

curl_args=(-sS)

if [[ -n "$ES_USERNAME_VALUE" || -n "$ES_PASSWORD_VALUE" ]]; then
  curl_args+=(-u "$ES_USERNAME_VALUE:$ES_PASSWORD_VALUE")
fi

exec curl "${curl_args[@]}" "$url" "$@"
