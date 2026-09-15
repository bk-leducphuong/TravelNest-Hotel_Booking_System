#!/bin/bash

# Migration script for existing date-based indices to ILM-managed indices
# This script helps transition from travelnest-logs-YYYY.MM.DD to ILM-managed indices

set -e

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
echo -e "${BLUE}TravelNest ILM Migration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check for old date-based indices
echo -e "${YELLOW}Checking for existing date-based indices...${NC}"
old_indices=$(curl -s -u "${ES_USER}:${ES_PASS}" \
    "${ES_HOST}/_cat/indices/travelnest-logs-*?h=index" | grep -E "travelnest-logs-[0-9]{4}\.[0-9]{2}\.[0-9]{2}" || true)

if [ -z "$old_indices" ]; then
    echo -e "${GREEN}✓ No old date-based indices found${NC}"
    echo -e "You can proceed with the new ILM-managed indices."
    exit 0
fi

echo -e "${YELLOW}Found the following date-based indices:${NC}"
echo "$old_indices" | nl
echo ""

# Calculate total size and document count
total_docs=0
total_size="0b"

echo -e "${YELLOW}Index details:${NC}"
echo ""
printf "%-35s %-15s %-15s\n" "Index" "Docs" "Size"
echo "--------------------------------------------------------------------------------"

while read -r index; do
    stats=$(curl -s -u "${ES_USER}:${ES_PASS}" \
        "${ES_HOST}/_cat/indices/${index}?h=docs.count,store.size")
    docs=$(echo "$stats" | awk '{print $1}')
    size=$(echo "$stats" | awk '{print $2}')
    printf "%-35s %-15s %-15s\n" "$index" "$docs" "$size"
    total_docs=$((total_docs + docs))
done <<< "$old_indices"

echo "--------------------------------------------------------------------------------"
echo -e "Total documents: ${GREEN}$total_docs${NC}"
echo ""

# Ask user what to do
echo -e "${YELLOW}Migration Options:${NC}"
echo "1) Keep old indices (recommended) - They will coexist with new ILM indices"
echo "2) Reindex old data into new ILM index (time-consuming)"
echo "3) Delete old indices (after backup!)"
echo "4) Exit without changes"
echo ""

read -p "Select option [1-4]: " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}✓ Keeping old indices${NC}"
        echo ""
        echo "Old indices will remain accessible for querying."
        echo "New logs will be written to ILM-managed indices."
        echo ""
        echo -e "${YELLOW}To query all logs (old + new):${NC}"
        echo "Use pattern: ${GREEN}travelnest-logs-*${NC}"
        echo ""
        echo -e "${YELLOW}Clean up old indices manually when ready:${NC}"
        echo "curl -u elastic:\$ELASTICSEARCH_PASSWORD -X DELETE $ES_HOST/travelnest-logs-YYYY.MM.DD"
        ;;
    
    2)
        echo ""
        echo -e "${YELLOW}Starting reindex process...${NC}"
        echo -e "${RED}Warning: This will take time and uses cluster resources${NC}"
        echo ""
        
        # Ensure ILM index exists
        bootstrap_check=$(curl -s -o /dev/null -w "%{http_code}" -u "${ES_USER}:${ES_PASS}" \
            "${ES_HOST}/travelnest-logs-000001")
        
        if [ "$bootstrap_check" -ne 200 ]; then
            echo -e "${RED}Error: ILM bootstrap index not found. Run setup-ilm.sh first${NC}"
            exit 1
        fi
        
        # Reindex each old index
        reindex_count=0
        while read -r index; do
            echo -e "${YELLOW}Reindexing $index...${NC}"
            
            response=$(curl -s -u "${ES_USER}:${ES_PASS}" \
                -X POST "${ES_HOST}/_reindex?wait_for_completion=false" \
                -H 'Content-Type: application/json' \
                -d "{
                  \"source\": { \"index\": \"$index\" },
                  \"dest\": { \"index\": \"travelnest-logs\", \"op_type\": \"create\" }
                }")
            
            task_id=$(echo "$response" | jq -r '.task' 2>/dev/null)
            
            if [ -n "$task_id" ] && [ "$task_id" != "null" ]; then
                echo -e "   ${GREEN}✓ Reindex task started: $task_id${NC}"
                ((reindex_count++))
            else
                echo -e "   ${RED}✗ Failed to start reindex${NC}"
                echo "$response" | jq '.' 2>/dev/null || echo "$response"
            fi
        done <<< "$old_indices"
        
        echo ""
        echo -e "${GREEN}✓ Started $reindex_count reindex tasks${NC}"
        echo ""
        echo -e "${YELLOW}Monitor progress:${NC}"
        echo "curl -u elastic:\$ELASTICSEARCH_PASSWORD $ES_HOST/_tasks?detailed=true&actions=*reindex"
        echo ""
        echo -e "${YELLOW}After reindex completes, verify data and delete old indices manually${NC}"
        ;;
    
    3)
        echo ""
        echo -e "${RED}⚠️  WARNING: You are about to DELETE indices!${NC}"
        echo -e "${RED}This action is IRREVERSIBLE!${NC}"
        echo ""
        echo -e "${YELLOW}Indices to be deleted:${NC}"
        echo "$old_indices" | nl
        echo ""
        read -p "Type 'DELETE' to confirm: " confirm
        
        if [ "$confirm" == "DELETE" ]; then
            echo ""
            deleted_count=0
            while read -r index; do
                echo -e "${YELLOW}Deleting $index...${NC}"
                response=$(curl -s -o /dev/null -w "%{http_code}" -u "${ES_USER}:${ES_PASS}" \
                    -X DELETE "${ES_HOST}/${index}")
                
                if [ "$response" -eq 200 ]; then
                    echo -e "   ${GREEN}✓ Deleted${NC}"
                    ((deleted_count++))
                else
                    echo -e "   ${RED}✗ Failed (HTTP $response)${NC}"
                fi
            done <<< "$old_indices"
            
            echo ""
            echo -e "${GREEN}✓ Deleted $deleted_count indices${NC}"
        else
            echo -e "${YELLOW}Deletion cancelled${NC}"
        fi
        ;;
    
    4)
        echo ""
        echo -e "${YELLOW}Exiting without changes${NC}"
        exit 0
        ;;
    
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Migration Complete${NC}"
echo -e "${BLUE}========================================${NC}"
