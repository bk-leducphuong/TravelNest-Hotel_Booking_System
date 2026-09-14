#!/bin/bash

# ILM Health Check Script
# Verifies ILM is working correctly

ES_HOST="${ELASTICSEARCH_HOST:-http://localhost:9200}"
ES_USER="${ELASTICSEARCH_USERNAME:-elastic}"
ES_PASS="${ELASTICSEARCH_PASSWORD}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$ES_PASS" ]; then
    echo -e "${RED}Error: ELASTICSEARCH_PASSWORD not set${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TravelNest ILM Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check ILM status
echo -e "${YELLOW}1. ILM Service Status${NC}"
ilm_status=$(curl -s -u "${ES_USER}:${ES_PASS}" "${ES_HOST}/_ilm/status")
operation_mode=$(echo "$ilm_status" | jq -r '.operation_mode' 2>/dev/null)

if [ "$operation_mode" == "RUNNING" ]; then
    echo -e "   ${GREEN}✓ ILM is RUNNING${NC}"
else
    echo -e "   ${RED}✗ ILM is $operation_mode${NC}"
fi
echo ""

# Check policy exists
echo -e "${YELLOW}2. ILM Policy Check${NC}"
policy_check=$(curl -s -o /dev/null -w "%{http_code}" -u "${ES_USER}:${ES_PASS}" \
    "${ES_HOST}/_ilm/policy/travelnest-logs-policy")

if [ "$policy_check" -eq 200 ]; then
    echo -e "   ${GREEN}✓ Policy 'travelnest-logs-policy' exists${NC}"
else
    echo -e "   ${RED}✗ Policy not found${NC}"
fi
echo ""

# Check index template
echo -e "${YELLOW}3. Index Template Check${NC}"
template_check=$(curl -s -o /dev/null -w "%{http_code}" -u "${ES_USER}:${ES_PASS}" \
    "${ES_HOST}/_index_template/travelnest-logs-template")

if [ "$template_check" -eq 200 ]; then
    echo -e "   ${GREEN}✓ Index template 'travelnest-logs-template' exists${NC}"
else
    echo -e "   ${RED}✗ Template not found${NC}"
fi
echo ""

# Check indices
echo -e "${YELLOW}4. Managed Indices${NC}"
indices=$(curl -s -u "${ES_USER}:${ES_PASS}" \
    "${ES_HOST}/_cat/indices/travelnest-logs-*?h=index,status,health,docs.count,store.size,pri,rep" | sort)

if [ -n "$indices" ]; then
    echo "$indices" | while read -r line; do
        echo -e "   ${GREEN}✓${NC} $line"
    done
else
    echo -e "   ${YELLOW}⚠ No indices found (they will be created when logs arrive)${NC}"
fi
echo ""

# Check write alias
echo -e "${YELLOW}5. Write Alias Check${NC}"
alias_info=$(curl -s -u "${ES_USER}:${ES_PASS}" \
    "${ES_HOST}/_cat/aliases/travelnest-logs?h=alias,index,is_write_index")

if [ -n "$alias_info" ]; then
    write_index=$(echo "$alias_info" | awk '{print $2}')
    is_write=$(echo "$alias_info" | awk '{print $3}')
    if [ "$is_write" == "true" ]; then
        echo -e "   ${GREEN}✓ Write alias 'travelnest-logs' → $write_index${NC}"
    else
        echo -e "   ${YELLOW}⚠ Alias exists but no write index${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠ Alias 'travelnest-logs' not found${NC}"
fi
echo ""

# Check ILM explain for any errors
echo -e "${YELLOW}6. ILM Execution Status${NC}"
ilm_explain=$(curl -s -u "${ES_USER}:${ES_PASS}" \
    "${ES_HOST}/travelnest-logs-*/_ilm/explain" 2>/dev/null)

if [ -n "$ilm_explain" ]; then
    errors=$(echo "$ilm_explain" | jq -r '.indices | to_entries[] | select(.value.step == "ERROR") | .key' 2>/dev/null)
    if [ -n "$errors" ]; then
        echo -e "   ${RED}✗ Found indices with ILM errors:${NC}"
        echo "$errors" | while read -r idx; do
            echo -e "      - $idx"
        done
    else
        # Show current phases
        phases=$(echo "$ilm_explain" | jq -r '.indices | to_entries[] | "\(.key): \(.value.phase)"' 2>/dev/null)
        if [ -n "$phases" ]; then
            echo "$phases" | while read -r line; do
                echo -e "   ${GREEN}✓${NC} $line"
            done
        else
            echo -e "   ${GREEN}✓ No errors detected${NC}"
        fi
    fi
else
    echo -e "   ${YELLOW}⚠ No ILM-managed indices yet${NC}"
fi
echo ""

# Check Logstash connectivity
echo -e "${YELLOW}7. Logstash Integration${NC}"
if docker ps | grep -q travelnest-logstash; then
    echo -e "   ${GREEN}✓ Logstash container is running${NC}"
    
    # Check Logstash logs for ILM mentions
    logstash_logs=$(docker logs travelnest-logstash 2>&1 | grep -i "ilm" | tail -3)
    if [ -n "$logstash_logs" ]; then
        echo -e "   ${BLUE}Recent ILM-related Logstash logs:${NC}"
        echo "$logstash_logs" | while read -r line; do
            echo -e "      $line"
        done
    fi
else
    echo -e "   ${YELLOW}⚠ Logstash container not found${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"

# Calculate health score
health_score=0
[ "$operation_mode" == "RUNNING" ] && ((health_score++))
[ "$policy_check" -eq 200 ] && ((health_score++))
[ "$template_check" -eq 200 ] && ((health_score++))
[ -n "$alias_info" ] && ((health_score++))

echo -e "Health Score: ${GREEN}$health_score/4${NC}"
echo ""

if [ $health_score -eq 4 ]; then
    echo -e "${GREEN}✓ ILM is fully configured and operational!${NC}"
    echo ""
    echo -e "${YELLOW}Monitor commands:${NC}"
    echo "  • View indices:  curl -u elastic:\$ELASTICSEARCH_PASSWORD $ES_HOST/_cat/indices/travelnest-logs-*?v"
    echo "  • ILM explain:   curl -u elastic:\$ELASTICSEARCH_PASSWORD $ES_HOST/travelnest-logs-*/_ilm/explain?pretty"
    echo "  • ILM status:    curl -u elastic:\$ELASTICSEARCH_PASSWORD $ES_HOST/_ilm/status"
elif [ $health_score -ge 2 ]; then
    echo -e "${YELLOW}⚠ ILM is partially configured. Review warnings above.${NC}"
else
    echo -e "${RED}✗ ILM is not properly configured. Run setup-ilm.sh${NC}"
fi
echo ""
