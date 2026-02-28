#!/usr/bin/env bash
################################################################################
# Deploy All Configuration Files
################################################################################

set -e

SCRIPT_DIR="${SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"
TARGET_DIR="/opt/travelnest"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Deploying configuration files from $PROJECT_ROOT to $TARGET_DIR"

# Docker Compose
log "Copying docker-compose.yml..."
cp "$PROJECT_ROOT/configs/docker-compose.yml" "$TARGET_DIR/docker-compose.yml"

# Environment variables
log "Creating .env file..."
cp "$PROJECT_ROOT/configs/.env.template" "$TARGET_DIR/.env"
chmod 600 "$TARGET_DIR/.env"

# Nginx configurations
log "Copying Nginx configurations..."
cp "$PROJECT_ROOT/configs/nginx/nginx.conf" "$TARGET_DIR/nginx/nginx.conf"
cp "$PROJECT_ROOT/configs/nginx/conf.d/"*.conf "$TARGET_DIR/nginx/conf.d/"

# Elasticsearch
log "Copying Elasticsearch configurations..."
cp "$PROJECT_ROOT/configs/elasticsearch/config/elasticsearch.yml" "$TARGET_DIR/elasticsearch/config/"
cp "$PROJECT_ROOT/configs/elasticsearch/mapping/"*.json "$TARGET_DIR/elasticsearch/mapping/"

# Logstash
log "Copying Logstash configurations..."
cp "$PROJECT_ROOT/configs/logstash/config/logstash.yml" "$TARGET_DIR/logstash/config/"
cp "$PROJECT_ROOT/configs/logstash/pipeline/logstash.conf" "$TARGET_DIR/logstash/pipeline/"

# Filebeat
log "Copying Filebeat configuration..."
cp "$PROJECT_ROOT/configs/filebeat/filebeat.yml" "$TARGET_DIR/filebeat/"

# ClickHouse
log "Copying ClickHouse initialization scripts..."
cp "$PROJECT_ROOT/configs/clickhouse/init/"*.sql "$TARGET_DIR/clickhouse/init/"

# Helper scripts
log "Copying helper scripts..."
cp "$PROJECT_ROOT/scripts/setup-kibana-user.sh" "$TARGET_DIR/scripts/"
cp "$PROJECT_ROOT/scripts/setup-hotels-index.sh" "$TARGET_DIR/scripts/"
cp "$PROJECT_ROOT/scripts/health-check.sh" "$TARGET_DIR/scripts/"
cp "$PROJECT_ROOT/scripts/mysql-backup.sh" "$TARGET_DIR/scripts/"
chmod +x "$TARGET_DIR/scripts/"*.sh

log "Setting proper ownership..."
REAL_USER="${REAL_USER:-$SUDO_USER}"
chown -R "$REAL_USER:$REAL_USER" "$TARGET_DIR"

# Elasticsearch data needs special ownership
chown -R 1000:1000 "$TARGET_DIR/data/elasticsearch"

log "✓ All configuration files deployed successfully"
