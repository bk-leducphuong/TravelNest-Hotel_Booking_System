#!/usr/bin/env bash
################################################################################
# Setup Elasticsearch Hotels Index
################################################################################

set -e
cd "$(dirname "$0")"
source .env

ES_URL="http://localhost:9200"
INDEX_NAME="logs"
MAPPING_FILE="./elasticsearch/mapping/logs-mapping.json"

echo "Checking if index '${INDEX_NAME}' exists..."

if curl -s -u "elastic:${ELASTICSEARCH_PASSWORD}" "${ES_URL}/${INDEX_NAME}" > /dev/null 2>&1; then
    echo "Index '${INDEX_NAME}' already exists."
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting index..."
        curl -X DELETE -u "elastic:${ELASTICSEARCH_PASSWORD}" "${ES_URL}/${INDEX_NAME}"
        echo ""
    else
        echo "Skipping."
        exit 0
    fi
fi

echo "Creating index '${INDEX_NAME}'..."
curl -X PUT -u "elastic:${ELASTICSEARCH_PASSWORD}" "${ES_URL}/${INDEX_NAME}" \
  -H "Content-Type: application/json" \
  -d @"${MAPPING_FILE}"

echo ""
echo "✓ Index '${INDEX_NAME}' created successfully!"

