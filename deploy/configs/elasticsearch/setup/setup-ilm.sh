#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ES_HOST="${ELASTICSEARCH_HOST:-http://localhost:9200}"
ES_USER="${ELASTICSEARCH_USERNAME:-elastic}"
ES_PASS="${ELASTICSEARCH_PASSWORD}"

if [ -z "$ES_PASS" ]; then
    echo -e "${RED}Error: ELASTICSEARCH_PASSWORD environment variable is not set${NC}"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}TravelNest Elasticsearch ILM Setup${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Function to check Elasticsearch health
check_elasticsearch() {
    echo -e "${YELLOW}Checking Elasticsearch connection...${NC}"
    response=$(curl -s -o /dev/null -w "%{http_code}" -u "${ES_USER}:${ES_PASS}" "${ES_HOST}/_cluster/health")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✓ Elasticsearch is reachable${NC}"
        return 0
    else
        echo -e "${RED}✗ Cannot connect to Elasticsearch (HTTP $response)${NC}"
        return 1
    fi
}

# Function to create ILM policy
create_ilm_policy() {
    echo ""
    echo -e "${YELLOW}Creating ILM policy 'travelnest-logs-policy'...${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -u "${ES_USER}:${ES_PASS}" \
        -X PUT "${ES_HOST}/_ilm/policy/travelnest-logs-policy" \
        -H 'Content-Type: application/json' \
        -d @"${SCRIPT_DIR}/ilm-policy.json")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ ILM policy created successfully${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}✗ Failed to create ILM policy (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Function to create index template
create_index_template() {
    echo ""
    echo -e "${YELLOW}Creating index template 'travelnest-logs-template'...${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -u "${ES_USER}:${ES_PASS}" \
        -X PUT "${ES_HOST}/_index_template/travelnest-logs-template" \
        -H 'Content-Type: application/json' \
        -d @"${SCRIPT_DIR}/index-template.json")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Index template created successfully${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}✗ Failed to create index template (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Function to create bootstrap index
create_bootstrap_index() {
    echo ""
    echo -e "${YELLOW}Creating bootstrap index 'travelnest-logs-000001'...${NC}"
    
    # Check if index already exists
    response=$(curl -s -o /dev/null -w "%{http_code}" -u "${ES_USER}:${ES_PASS}" \
        "${ES_HOST}/travelnest-logs-000001")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${YELLOW}⚠ Index 'travelnest-logs-000001' already exists${NC}"
        return 0
    fi
    
    response=$(curl -s -w "\n%{http_code}" -u "${ES_USER}:${ES_PASS}" \
        -X PUT "${ES_HOST}/travelnest-logs-000001" \
        -H 'Content-Type: application/json' \
        -d '{
          "aliases": {
            "travelnest-logs": {
              "is_write_index": true
            }
          }
        }')
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Bootstrap index created successfully${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}✗ Failed to create bootstrap index (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Function to verify setup
verify_setup() {
    echo ""
    echo -e "${YELLOW}Verifying ILM setup...${NC}"
    
    # Check ILM policy
    echo -e "${YELLOW}Checking ILM policy...${NC}"
    curl -s -u "${ES_USER}:${ES_PASS}" \
        "${ES_HOST}/_ilm/policy/travelnest-logs-policy" | jq '.' 2>/dev/null
    
    # Check index template
    echo ""
    echo -e "${YELLOW}Checking index template...${NC}"
    curl -s -u "${ES_USER}:${ES_PASS}" \
        "${ES_HOST}/_index_template/travelnest-logs-template" | jq '.index_templates[0].index_template.template.settings.index.lifecycle' 2>/dev/null
    
    # Check indices
    echo ""
    echo -e "${YELLOW}Current indices:${NC}"
    curl -s -u "${ES_USER}:${ES_PASS}" \
        "${ES_HOST}/_cat/indices/travelnest-logs-*?v&s=index"
    
    # Check aliases
    echo ""
    echo -e "${YELLOW}Current aliases:${NC}"
    curl -s -u "${ES_USER}:${ES_PASS}" \
        "${ES_HOST}/_cat/aliases/travelnest-logs?v"
}

# Main execution
main() {
    if ! check_elasticsearch; then
        exit 1
    fi
    
    if ! create_ilm_policy; then
        exit 1
    fi
    
    if ! create_index_template; then
        exit 1
    fi
    
    if ! create_bootstrap_index; then
        echo -e "${YELLOW}⚠ Bootstrap index creation failed, but continuing...${NC}"
    fi
    
    verify_setup
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}ILM Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}ILM Policy Phases:${NC}"
    echo -e "  • ${GREEN}Hot${NC}:    Rollover after 1 day or 50GB"
    echo -e "  • ${YELLOW}Warm${NC}:   After 7 days - force merge & shrink"
    echo -e "  • ${YELLOW}Cold${NC}:   After 30 days - freeze index"
    echo -e "  • ${RED}Delete${NC}: After 90 days - delete index"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "  1. Update Logstash output to write to alias: ${GREEN}travelnest-logs${NC}"
    echo -e "  2. Monitor ILM execution: curl -u elastic:password ${ES_HOST}/_ilm/status"
    echo -e "  3. Check index lifecycle: curl -u elastic:password ${ES_HOST}/travelnest-logs-*/_ilm/explain"
    echo ""
}

main
