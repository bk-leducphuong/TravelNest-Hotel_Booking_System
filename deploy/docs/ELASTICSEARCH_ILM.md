# Elasticsearch Index Lifecycle Management (ILM) Setup

## 📋 Quick Start

### On Your Local Machine (Development)

1. Navigate to the elasticsearch setup directory:
```bash
cd configs/elasticsearch/setup
```

2. Set your Elasticsearch password:
```bash
export ELASTICSEARCH_PASSWORD="your-password"
```

3. Run the setup script:
```bash
./setup-ilm.sh
```

4. Update Logstash configuration (already done in `configs/logstash/pipeline/logstash.conf`)

5. Restart Logstash:
```bash
docker restart travelnest-logstash
```

### On VPS (Production)

1. Copy the setup files to your VPS:
```bash
scp -r configs/elasticsearch/setup/* user@your-vps:/opt/travelnest/elasticsearch/setup/
```

Or if using git:
```bash
# On VPS
cd /opt/travelnest
git pull origin main
```

2. SSH into your VPS:
```bash
ssh user@your-vps
cd /opt/travelnest/elasticsearch/setup
```

3. Run the setup:
```bash
# Set password from .env or manually
source /opt/travelnest/.env
./setup-ilm.sh
```

4. Copy updated Logstash config and restart:
```bash
# Copy new logstash.conf with ILM settings
docker restart travelnest-logstash
```

5. Verify setup:
```bash
./check-ilm.sh
```

## 🔍 What Was Changed

### 1. Added ILM Policy (`ilm-policy.json`)
Defines lifecycle management with 4 phases:
- **Hot**: Rollover after 1 day or 50GB
- **Warm**: After 7 days - compress & optimize
- **Cold**: After 30 days - freeze (minimal resources)
- **Delete**: After 90 days - permanent deletion

### 2. Created Index Template (`index-template.json`)
- Applies mappings automatically to new indices
- Links indices to ILM policy
- Sets optimal settings for single-node setup (0 replicas)

### 3. Updated Logstash Pipeline
Changed from:
```conf
index => "travelnest-logs-%{+YYYY.MM.dd}"
```

To:
```conf
index => "travelnest-logs"
ilm_enabled => true
ilm_rollover_alias => "travelnest-logs"
ilm_pattern => "000001"
ilm_policy => "travelnest-logs-policy"
```

### 4. Added Management Scripts
- `setup-ilm.sh` - Initial setup and configuration
- `check-ilm.sh` - Health check and verification
- `migrate-indices.sh` - Handle existing date-based indices
- `deploy-to-vps.sh` - Quick deployment helper

## 📊 How It Works

### Before ILM
```
travelnest-logs-2026.03.01  (grows forever)
travelnest-logs-2026.03.02  (grows forever)
travelnest-logs-2026.03.03  (grows forever)
...
→ Unlimited growth, manual cleanup needed
```

### After ILM
```
travelnest-logs-000001  [hot]   → writing logs (current)
travelnest-logs-000002  [hot]   → rolled over, indexing
travelnest-logs-000003  [warm]  → 7 days old, compressed
travelnest-logs-000004  [cold]  → 30 days old, frozen
travelnest-logs-000005  → deleted after 90 days
↓
Automatic lifecycle management, disk space controlled
```

## 🔧 Management Commands

### Check ILM Status
```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/_ilm/status?pretty
```

### View Indices
```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/_cat/indices/travelnest-logs-*?v
```

### Check Write Alias
```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/_cat/aliases/travelnest-logs?v
```

### Explain ILM State
```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/travelnest-logs-*/_ilm/explain?pretty
```

### Manual Rollover (if needed)
```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD -X POST \
  http://localhost:9200/travelnest-logs/_rollover?pretty
```

## 🚨 Troubleshooting

### Problem: Old date-based indices still exist

**Solution**: Run the migration script:
```bash
cd /opt/travelnest/elasticsearch/setup
./migrate-indices.sh
```

Choose option 1 to keep them (recommended) - they'll coexist peacefully.

### Problem: ILM not executing

**Check if ILM is running**:
```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/_ilm/status
```

**Start ILM if stopped**:
```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD -X POST \
  http://localhost:9200/_ilm/start
```

### Problem: Cluster health is yellow

This is expected during the warm phase when shrinking indices. Check:
```bash
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/_cluster/health?pretty
```

### Problem: Logstash not writing to new indices

1. Check Logstash logs:
```bash
docker logs travelnest-logstash --tail 100
```

2. Verify Logstash config was updated:
```bash
docker exec travelnest-logstash cat /usr/share/logstash/pipeline/logstash.conf | grep ilm
```

3. Restart Logstash:
```bash
docker restart travelnest-logstash
```

## 📈 Benefits

1. **Automatic Cleanup**: Logs deleted after 90 days
2. **Disk Space Management**: Controlled growth (~50GB steady state)
3. **Performance Optimization**: Old data compressed and optimized
4. **Zero Maintenance**: Set it and forget it
5. **Cost Effective**: Less storage = lower costs

## 🔄 Customization

To change retention periods, edit `configs/elasticsearch/setup/ilm-policy.json`:

```json
{
  "policy": {
    "phases": {
      "hot": { "min_age": "0ms" },
      "warm": { "min_age": "7d" },    // ← Change these values
      "cold": { "min_age": "30d" },   // ← Change these values
      "delete": { "min_age": "90d" }  // ← Change these values
    }
  }
}
```

Then re-run the setup:
```bash
./setup-ilm.sh
```

## 📝 Files Added

```
configs/elasticsearch/setup/
├── ilm-policy.json          # ILM lifecycle policy definition
├── index-template.json      # Index template with mappings
├── setup-ilm.sh             # Setup script
├── check-ilm.sh             # Health check script
├── migrate-indices.sh       # Migration helper for old indices
├── deploy-to-vps.sh         # VPS deployment script
└── README.md                # Detailed documentation
```

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] ILM policy exists: `curl -u elastic:$PASS http://localhost:9200/_ilm/policy/travelnest-logs-policy`
- [ ] Index template exists: `curl -u elastic:$PASS http://localhost:9200/_index_template/travelnest-logs-template`
- [ ] Bootstrap index created: `curl -u elastic:$PASS http://localhost:9200/travelnest-logs-000001`
- [ ] Write alias configured: `curl -u elastic:$PASS http://localhost:9200/_cat/aliases/travelnest-logs`
- [ ] Logstash restarted: `docker ps | grep travelnest-logstash`
- [ ] New logs being indexed: Check Kibana or curl indices endpoint

## 🎯 Next Steps

1. **Monitor for 24 hours** to ensure logs are being indexed correctly
2. **Check disk usage** to verify space is being managed
3. **Review Kibana dashboards** to ensure data visibility
4. **Run health check weekly**: `./check-ilm.sh`
5. **Plan for old indices**: Run `./migrate-indices.sh` when ready

## 📚 Additional Resources

- Full documentation: `configs/elasticsearch/setup/README.md`
- Elasticsearch ILM docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html
- Logstash ILM integration: https://www.elastic.co/guide/en/logstash/current/plugins-outputs-elasticsearch.html#plugins-outputs-elasticsearch-ilm

---

**Questions or Issues?**
- Check the detailed README in `configs/elasticsearch/setup/README.md`
- Review Logstash logs: `docker logs travelnest-logstash`
- Run health check: `./check-ilm.sh`
