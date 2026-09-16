#!/usr/bin/env bash

set -e

CONTAINER="travelnest-clickhouse"
SQL_FILE="clickhouse/init/01-create-search-logs.sql"

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "❌ Container '$CONTAINER' is not running."
  exit 1
fi

echo "🚀 Running ClickHouse initialization script..."

docker exec -i "$CONTAINER" \
  clickhouse-client --multiquery < "$SQL_FILE"

echo "✅ Done."
