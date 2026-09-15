#!/usr/bin/env bash
################################################################################
# Post-Deployment Setup Script
# 
# Run this after starting Docker Compose for the first time
################################################################################

set -e

TARGET_DIR="/opt/travelnest"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

cd "$TARGET_DIR"

log "Starting post-deployment setup..."

# Load environment variables
if [ ! -f .env ]; then
    log_warn ".env file not found!"
    exit 1
fi

source .env

################################################################################
# 1. Wait for Elasticsearch
################################################################################
log "Waiting for Elasticsearch to be ready..."
MAX_WAIT=120
WAIT_COUNT=0

until curl -s -u "elastic:${ELASTICSEARCH_PASSWORD}" "http://localhost:9200/_cluster/health" > /dev/null 2>&1; do
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $WAIT_COUNT -gt $MAX_WAIT ]; then
        log_warn "Elasticsearch did not start in time. Check logs: docker compose logs elasticsearch"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""
log "✓ Elasticsearch is ready"

################################################################################
# 2. Setup Kibana System User
################################################################################
log "Setting up Kibana system user..."
bash ./scripts/setup-kibana-user.sh
log "✓ Kibana system user configured"

################################################################################
# 3. Wait for Kibana
################################################################################
log "Waiting for Kibana to be ready..."
log "Restarting Kibana with new credentials..."
docker compose restart kibana

WAIT_COUNT=0
until curl -s "http://localhost:5601/api/status" > /dev/null 2>&1; do
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $WAIT_COUNT -gt $MAX_WAIT ]; then
        log_warn "Kibana did not start in time. Check logs: docker compose logs kibana"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""
log "✓ Kibana is ready"

################################################################################
# 4. Setup Elasticsearch Hotels Index
################################################################################
log "Setting up Elasticsearch hotels index..."
bash ./scripts/setup-hotels-index.sh
log "✓ Hotels index created"

################################################################################
# 5. Verify ClickHouse Tables
################################################################################
log "Verifying ClickHouse tables..."
TABLES=$(docker exec travelnest-clickhouse clickhouse-client --query "SHOW TABLES FROM travelnest" 2>/dev/null || echo "")
if [ -z "$TABLES" ]; then
    log_warn "ClickHouse tables not found. They should be auto-created on first API call."
else
    log "✓ ClickHouse tables:"
    echo "$TABLES"
fi

################################################################################
# 6. Verify All Services
################################################################################
log "Verifying all services..."
docker compose ps

################################################################################
# 7. Run Health Check
################################################################################
log "Running health check..."
bash ./scripts/health-check.sh

################################################################################
# Complete
################################################################################
echo ""
log "✅ Post-deployment setup complete!"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Access Kibana: http://your-server-ip:5601"
echo "   Username: elastic"
echo "   Password: (from .env ELASTICSEARCH_PASSWORD)"
echo ""
echo "2. Test API health: curl http://localhost:3000/health"
echo ""
echo "3. Access services:"
echo "   - User Client: https://deployserver.work"
echo "   - Admin Client: https://admin.deployserver.work"
echo "   - API: https://api.deployserver.work"
echo ""
echo "4. View logs:"
echo "   docker compose logs -f api"
echo "   docker compose logs -f elasticsearch"
echo ""
