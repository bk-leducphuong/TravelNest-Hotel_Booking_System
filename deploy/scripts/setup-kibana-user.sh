#!/usr/bin/env bash
################################################################################
# Setup Kibana System User Password
################################################################################

set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    exit 1
fi

source .env

ES_URL="http://localhost:9200"
ELASTIC_PASS="${ELASTICSEARCH_PASSWORD:?ELASTICSEARCH_PASSWORD not set in .env}"
KIBANA_PASS="${KIBANA_SYSTEM_PASSWORD:?KIBANA_SYSTEM_PASSWORD not set in .env}"

echo "Setting kibana_system password in Elasticsearch..."

curl -s -u "elastic:${ELASTIC_PASS}" -X POST "${ES_URL}/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"${KIBANA_PASS}\"}" > /dev/null

echo ""
echo "✓ Kibana system user password set successfully!"
