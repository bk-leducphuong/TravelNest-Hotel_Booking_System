#!/usr/bin/env bash
################################################################################
# Create Complete Directory Structure for TravelNest
################################################################################

set -e

TARGET_DIR="/opt/travelnest"
REAL_USER="${REAL_USER:-$SUDO_USER}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Creating main application directory: $TARGET_DIR"
mkdir -p "$TARGET_DIR"

cd "$TARGET_DIR"

log "Creating directory structure..."

# Main directories
mkdir -p logs backups data nginx releases elasticsearch logstash filebeat clickhouse scripts

# Nginx directories
mkdir -p nginx/conf.d
mkdir -p nginx/html/user
mkdir -p nginx/html/admin

# Data directories
mkdir -p data/mysql
mkdir -p data/redis
mkdir -p data/elasticsearch
mkdir -p data/clickhouse
mkdir -p data/minio

# Backup directories
mkdir -p backups/mysql
mkdir -p backups/redis
mkdir -p backups/elasticsearch

# Log directories
mkdir -p logs/nginx
mkdir -p logs/api
mkdir -p logs/mysql
mkdir -p logs/elasticsearch
mkdir -p logs/logstash
mkdir -p logs/filebeat

# Release directories
mkdir -p releases/user-client
mkdir -p releases/admin-client
mkdir -p releases/api

# ELK directories
mkdir -p elasticsearch/config
mkdir -p elasticsearch/mapping
mkdir -p elasticsearch/setup
mkdir -p logstash/config
mkdir -p logstash/pipeline
mkdir -p filebeat/config

# ClickHouse directories
mkdir -p clickhouse/init

log "Setting permissions..."

# Set ownership to target user
chown -R "$REAL_USER:$REAL_USER" "$TARGET_DIR"

# Set standard permissions
chmod -R 755 "$TARGET_DIR"

# Logs need to be writable
chmod -R 777 "$TARGET_DIR/logs"

# MySQL data should be restricted
chmod -R 700 "$TARGET_DIR/data/mysql"

# Elasticsearch requires specific ownership (UID 1000)
chown -R 1000:1000 "$TARGET_DIR/data/elasticsearch"
chmod -R 755 "$TARGET_DIR/data/elasticsearch"

log "Creating placeholder index.html files..."
echo "<h1>TravelNest User Client</h1><p>Waiting for deployment...</p>" > "$TARGET_DIR/nginx/html/user/index.html"
echo "<h1>TravelNest Admin Client</h1><p>Waiting for deployment...</p>" > "$TARGET_DIR/nginx/html/admin/index.html"

log "Directory structure created successfully!"
log "Location: $TARGET_DIR"

# Display tree (if available)
if command -v tree &> /dev/null; then
    tree -L 2 "$TARGET_DIR"
else
    find "$TARGET_DIR" -maxdepth 2 -type d
fi
