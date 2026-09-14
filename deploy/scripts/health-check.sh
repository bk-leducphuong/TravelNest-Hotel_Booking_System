#!/usr/bin/env bash
################################################################################
# TravelNest Health Check Script
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "═══════════════════════════════════════════════════════════"
echo "           TravelNest Health Check"
echo "═══════════════════════════════════════════════════════════"
echo "Date: $(date)"
echo ""

################################################################################
# Docker Status
################################################################################
echo -e "${BLUE}Docker Status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep travelnest || echo "No containers running"
echo ""

################################################################################
# System Resources
################################################################################
echo -e "${BLUE}System Resources:${NC}"
echo "Disk Usage:"
df -h / | grep -E "^/dev|Filesystem"
echo ""

echo "Memory Usage:"
free -h
echo ""

echo "CPU Load:"
uptime
echo ""

################################################################################
# Container Health
################################################################################
echo -e "${BLUE}Container Health Status:${NC}"
CONTAINERS=(
    "travelnest-nginx"
    "travelnest-api"
    "travelnest-mysql"
    "travelnest-redis"
    "travelnest-elasticsearch"
    "travelnest-clickhouse"
    "travelnest-minio"
    "travelnest-kibana"
    "travelnest-logstash"
    "travelnest-filebeat"
)

for container in "${CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no healthcheck")
        if [ "$health" = "healthy" ] || [ "$health" = "no healthcheck" ]; then
            echo -e "${GREEN}✓${NC} $container: $health"
        else
            echo -e "${RED}✗${NC} $container: $health"
        fi
    else
        echo -e "${RED}✗${NC} $container: not running"
    fi
done
echo ""

################################################################################
# Service Endpoints
################################################################################
echo -e "${BLUE}Service Endpoint Tests:${NC}"

# MySQL
if docker exec travelnest-mysql mysqladmin ping -h localhost 2>&1 | grep -q "mysqld is alive"; then
    echo -e "${GREEN}✓${NC} MySQL: responding"
else
    echo -e "${RED}✗${NC} MySQL: not responding"
fi

# Redis
if docker exec travelnest-redis redis-cli ping 2>&1 | grep -q "PONG"; then
    echo -e "${GREEN}✓${NC} Redis: responding"
else
    echo -e "${RED}✗${NC} Redis: not responding"
fi

# Elasticsearch
if curl -s http://localhost:9200 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Elasticsearch: responding (port 9200)"
else
    echo -e "${RED}✗${NC} Elasticsearch: not responding"
fi

# API
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API: responding (port 3000)"
else
    echo -e "${YELLOW}!${NC} API: not responding or no /health endpoint"
fi

# Kibana
if curl -s http://localhost:5601/api/status > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Kibana: responding (port 5601)"
else
    echo -e "${YELLOW}!${NC} Kibana: not responding"
fi

echo ""

################################################################################
# Recent Errors
################################################################################
echo -e "${BLUE}Recent Errors in API Logs (last 5):${NC}"
docker logs travelnest-api --tail 50 2>&1 | grep -i error | tail -5 || echo "No errors found"
echo ""

################################################################################
# Data Volumes
################################################################################
echo -e "${BLUE}Data Volume Usage:${NC}"
cd /opt/travelnest
du -sh data/* 2>/dev/null || echo "No data directories found"
echo ""

################################################################################
# Summary
################################################################################
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}Health check complete!${NC}"
echo "═══════════════════════════════════════════════════════════"
