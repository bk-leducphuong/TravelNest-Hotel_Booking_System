#!/usr/bin/env bash
# One-time setup: set password for kibana_system user so Kibana can connect.
# Run after Elasticsearch is up. Requires ELASTICSEARCH_PASSWORD and KIBANA_SYSTEM_PASSWORD in .env.
set -e
cd "$(dirname "$0")"
source .env 2>/dev/null || true
# Use localhost when running from host (ES port 9200 is published)
ES_URL="${ELASTICSEARCH_HOSTS:-http://localhost:9200}"
ES_URL="${ES_URL//elasticsearch/localhost}"
ELASTIC_PASS="${ELASTICSEARCH_PASSWORD:?Set ELASTICSEARCH_PASSWORD in .env}"
KIBANA_PASS="${KIBANA_SYSTEM_PASSWORD:?Set KIBANA_SYSTEM_PASSWORD in .env}"
echo "Setting kibana_system password in Elasticsearch..."
curl -s -u "elastic:${ELASTIC_PASS}" -X POST "${ES_URL}/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"${KIBANA_PASS}\"}"
echo ""
echo "Done. You can start Kibana now."
