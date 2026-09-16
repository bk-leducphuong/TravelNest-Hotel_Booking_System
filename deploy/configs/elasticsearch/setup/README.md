# Index Lifecycle Management (ILM) for TravelNest Logs

This directory contains configuration for Elasticsearch Index Lifecycle Management to automatically manage log retention and cleanup.

## 📋 Overview

The ILM policy automatically manages your log indices through four lifecycle phases:

### Lifecycle Phases

| Phase | Trigger | Actions |
|-------|---------|---------|
| **Hot** | Immediate | • Rollover after 1 day or 50GB<br>• Priority: 100 (highest) |
| **Warm** | After 7 days | • Force merge to 1 segment<br>• Shrink to 1 shard<br>• Make read-only<br>• Priority: 50 |
| **Cold** | After 30 days | • Freeze index (minimal resources)<br>• Priority: 0 |
| **Delete** | After 90 days | • Permanently delete index |

## 📁 Files

- `ilm-policy.json` - ILM policy definition
- `index-template.json` - Index template with mappings and ILM settings
- `setup-ilm.sh` - Automated setup script
- `README.md` - This file

## 🚀 Setup Instructions

### Prerequisites

1. Elasticsearch must be running
2. Set environment variables:
   ```bash
   export ELASTICSEARCH_PASSWORD="your-password"
   export ELASTICSEARCH_USERNAME="elastic"  # optional, defaults to 'elastic'
   export ELASTICSEARCH_HOST="http://localhost:9200"  # optional
   ```

### Installation

Run the setup script from the elasticsearch directory:

```bash
cd /opt/travelnest/elasticsearch/setup
./setup-ilm.sh
```

The script will:
1. ✓ Check Elasticsearch connectivity
2. ✓ Create ILM policy `travelnest-logs-policy`
3. ✓ Create index template `travelnest-logs-template`
4. ✓ Create bootstrap index `travelnest-logs-000001`
5. ✓ Verify the setup

### Expected Output

```
========================================
TravelNest Elasticsearch ILM Setup
========================================

✓ Elasticsearch is reachable
✓ ILM policy created successfully
✓ Index template created successfully
✓ Bootstrap index created successfully

========================================
ILM Setup Complete!
========================================
```

## 🔄 Logstash Configuration

The Logstash pipeline has been updated to use the ILM-managed alias:

```conf
output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    user => "elastic"
    password => "${ELASTICSEARCH_PASSWORD}"
    index => "travelnest-logs"
    ilm_enabled => true
    ilm_rollover_alias => "travelnest-logs"
    ilm_pattern => "000001"
    ilm_policy => "travelnest-logs-policy"
  }
}
```

After setup, **restart Logstash** for changes to take effect:

```bash
docker restart travelnest-logstash
```

## 📊 Monitoring & Management

### Check ILM Status

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/_ilm/status?pretty
```

### View All Indices with ILM Info

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/_cat/indices/travelnest-logs-*?v&s=index
```

### Explain ILM State for Indices

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/travelnest-logs-*/_ilm/explain?pretty
```

### View ILM Policy

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/_ilm/policy/travelnest-logs-policy?pretty
```

### Check Write Alias

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/_cat/aliases/travelnest-logs?v
```

### View Index Settings

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/travelnest-logs-*/_settings?pretty
```

## 🛠️ Advanced Operations

### Manual Rollover

Trigger a manual rollover if needed:

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD -X POST \
  http://localhost:9200/travelnest-logs/_rollover?pretty
```

### Update ILM Policy

To change retention periods, edit `ilm-policy.json` and re-run:

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD -X PUT \
  http://localhost:9200/_ilm/policy/travelnest-logs-policy \
  -H 'Content-Type: application/json' \
  -d @ilm-policy.json
```

### Stop ILM (Emergency)

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD -X POST \
  http://localhost:9200/_ilm/stop?pretty
```

### Start ILM

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD -X POST \
  http://localhost:9200/_ilm/start?pretty
```

### Retry Failed ILM Steps

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD -X POST \
  http://localhost:9200/travelnest-logs-*/_ilm/retry?pretty
```

## 🔧 Troubleshooting

### Index Shows "unassigned_shards"

This is normal during warm phase when shrinking. Check:

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/_cat/shards/travelnest-logs-*?v
```

### ILM Not Executing

1. Check ILM is running:
   ```bash
   curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/_ilm/status
   ```

2. Check for errors:
   ```bash
   curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/travelnest-logs-*/_ilm/explain?pretty | grep -A 5 '"failed_step"'
   ```

### Old Date-Based Indices

If you have old indices (`travelnest-logs-YYYY.MM.DD`), you can:

1. **Keep them** - They'll be unaffected by ILM
2. **Manually delete** - After backing up if needed:
   ```bash
   curl -u elastic:$ELASTICSEARCH_PASSWORD -X DELETE \
     http://localhost:9200/travelnest-logs-2026.03.09
   ```
3. **Bulk delete old indices** (older than 90 days):
   ```bash
   # List indices older than 90 days
   curator_cli --host localhost --http_auth elastic:$ELASTICSEARCH_PASSWORD \
     delete_indices --filter_list '[{"filtertype":"age","source":"name","direction":"older","timestring":"%Y.%m.%d","unit":"days","unit_count":90}]'
   ```

### Verify Bootstrap Index

```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/travelnest-logs-000001?pretty
```

Should show:
```json
{
  "aliases": {
    "travelnest-logs": {
      "is_write_index": true
    }
  }
}
```

## 📈 Disk Space Savings

Expected disk usage reduction:

- **Before ILM**: ~30GB/month indefinitely
- **After ILM**: 
  - Hot (30 days): ~30GB
  - Warm (30 days): ~15GB (compression + force merge)
  - Cold (30 days): ~5GB (frozen)
  - Total: ~50GB steady state vs unlimited growth

## 🔐 Security Note

The ILM policy automatically handles:
- ✓ Index rotation (prevents indices from growing too large)
- ✓ Resource optimization (moves old data to less expensive storage)
- ✓ Automatic cleanup (deletes after 90 days)
- ✓ Single-node compatible (0 replicas)

## 📝 Customization

To adjust retention periods, edit `ilm-policy.json`:

```json
{
  "policy": {
    "phases": {
      "hot": { "min_age": "0ms", "actions": { "rollover": { "max_age": "7d" } } },
      "warm": { "min_age": "14d", ... },
      "cold": { "min_age": "60d", ... },
      "delete": { "min_age": "180d", ... }  // Keep for 6 months instead
    }
  }
}
```

Then update the policy:
```bash
cd /opt/travelnest/elasticsearch/setup
./setup-ilm.sh
```

## 📚 References

- [Elasticsearch ILM Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html)
- [ILM Tutorial](https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started-index-lifecycle-management.html)
- [Logstash ILM Integration](https://www.elastic.co/guide/en/logstash/current/plugins-outputs-elasticsearch.html#plugins-outputs-elasticsearch-ilm)
