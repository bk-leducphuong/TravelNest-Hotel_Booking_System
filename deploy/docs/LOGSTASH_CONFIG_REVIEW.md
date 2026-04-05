# Logstash Pipeline Configuration Review

## 📋 Summary

Your updated Logstash configuration has been significantly improved with proper conditional checks and enhanced parsing capabilities.

---

## ✅ **What Was Fixed**

### 1. **Conditional Field Extraction** ✓
- **Before**: Fields extracted without checking existence → literal strings like `"%{[parsed][field]}"`
- **After**: Proper conditional checks → only extract fields that exist

### 2. **Type Conversion** ✓
- **Added**: Proper type conversion for numeric fields
  - `http_status_code` → integer
  - `response_time_ms` → float
  - `body_bytes_sent` → integer
  - `pid`, `connection_id` → integer

### 3. **Nginx Log Parsing** ✓
- **Added**: Dedicated parsing for Nginx access logs (combined format)
- **Added**: Dedicated parsing for Nginx error logs
- **Benefit**: Proper extraction of client IP, user agent, referer, etc.

### 4. **Multiple Log Format Support** ✓
- JSON logs (Pino/Winston/Bunyan)
- Nginx access logs (combined format)
- Nginx error logs
- Generic fallback for unknown formats

### 5. **Pino Logger Support** ✓
- **Added**: Numeric log level conversion (Pino uses 30=info, 40=warn, 50=error, 60=fatal)
- **Benefit**: Works with both Pino and Winston logging libraries

### 6. **Enhanced Features** ✓
- HTTP status code classification (2xx, 3xx, 4xx, 5xx tags)
- GeoIP enrichment for non-private IPs
- Field normalization for consistency
- Better error handling with failure tags
- Multiple timestamp format support

---

## 🔧 **Configuration Structure**

### Input Section
```conf
input {
  beats {
    port => 5044
    host => "0.0.0.0"
  }
}
```
- Receives data from Filebeat on port 5044
- Listens on all interfaces (0.0.0.0)

### Filter Section (8 Processing Stages)

#### **Stage 1: JSON Log Parsing** (Lines 12-146)
Handles application logs in JSON format (Pino, Winston, Bunyan):
- Parses JSON structure
- Converts numeric log levels to strings
- Extracts HTTP request/response fields
- Converts types (statusCode → integer, responseTime → float)
- Tags: `json`, `application`

#### **Stage 2: Nginx Access Log Parsing** (Lines 151-175)
Parses Nginx access logs (combined format):
- Extracts: client_ip, method, URL, status code, user agent, referer
- Parses timestamp format: `dd/MMM/yyyy:HH:mm:ss Z`
- Tags: `nginx`, `access`

#### **Stage 3: Nginx Error Log Parsing** (Lines 180-204)
Parses Nginx error logs:
- Extracts: log level, PID, connection ID, error message
- Parses timestamp format: `yyyy/MM/dd HH:mm:ss`
- Tags: `nginx`, `error`

#### **Stage 4: Generic Fallback** (Lines 209-220)
Handles any other log format:
- Basic ISO8601 timestamp + log level extraction
- Tags: `generic`
- Adds `_grokparsefailure_generic` if parsing fails

#### **Stage 5: Timestamp Parsing** (Lines 225-238)
Handles multiple timestamp formats:
- ISO8601
- `yyyy-MM-dd HH:mm:ss`
- `yyyy-MM-dd'T'HH:mm:ss.SSSZ`
- Unix milliseconds
- Tags: `_dateparsefailure` if parsing fails

#### **Stage 6: Severity Classification** (Lines 243-265)
Classifies log severity:
- `fatal`/`error` → severity: high, tags: error, high_priority
- `warn`/`warning` → severity: medium, tags: warning
- `info` → severity: low
- `debug`/`trace` → severity: info

#### **Stage 7: HTTP Classification** (Lines 270-280)
Tags HTTP requests by status code:
- 5xx → `http_5xx`, `server_error`
- 4xx → `http_4xx`, `client_error`
- 3xx → `http_3xx`, `redirect`
- 2xx → `http_2xx`, `success`

#### **Stage 8: Enrichment & Cleanup** (Lines 285-345)
- Adds hostname from Filebeat metadata
- Normalizes field names (http_method → method)
- GeoIP enrichment for public IPs
- Removes temporary fields
- Cleans up failure tags

### Output Section (Lines 348-361)
```conf
output {
  elasticsearch {
    index => "travelnest-logs"
    ilm_enabled => true
    ilm_rollover_alias => "travelnest-logs"
    ilm_pattern => "000001"
    ilm_policy => "travelnest-logs-policy"
  }
}
```
- Writes to ILM-managed alias
- Automatic index lifecycle management

---

## 📊 **Field Mapping**

### JSON Logs (Application)
| Source Field | Destination Field | Type | Notes |
|-------------|------------------|------|-------|
| `level` | `log_level` | keyword | Converts numeric Pino levels |
| `time`/`timestamp` | `@timestamp` | date | Multiple format support |
| `msg`/`message` | `log_message` | text | Log message content |
| `requestId`/`reqId` | `request_id` | keyword | Request correlation ID |
| `userId` | `user_id` | keyword | User identifier |
| `method` | `http_method` | keyword | HTTP method |
| `url` | `http_url` | text | Request URL |
| `statusCode` | `http_status_code` | integer | HTTP status (with type conversion) |
| `responseTime`/`duration` | `response_time_ms` | float | Response time in ms |
| `err.message` | `error_message` | text | Error message |
| `err.stack`/`stack` | `error_stack` | text | Stack trace |

### Nginx Access Logs
| Extracted Field | Type | Example |
|----------------|------|---------|
| `client_ip` | ip | `192.168.1.1` |
| `remote_user` | keyword | `john` or `-` |
| `http_method` | keyword | `GET` |
| `http_url` | text | `/api/hotels` |
| `http_version` | keyword | `1.1` |
| `http_status_code` | integer | `200` |
| `body_bytes_sent` | integer | `1234` |
| `http_referer` | text | `https://example.com` |
| `http_user_agent` | text | `Mozilla/5.0...` |

### Nginx Error Logs
| Extracted Field | Type | Example |
|----------------|------|---------|
| `log_level` | keyword | `error`, `warn` |
| `pid` | integer | `1234` |
| `tid` | float | `0` |
| `connection_id` | integer | `5` |
| `error_message` | text | `connect() failed` |

---

## 🏷️ **Tags & Classification**

### Log Source Tags
- `json` - JSON formatted logs
- `application` - Application logs
- `nginx` - Nginx logs
- `access` - Access/request logs
- `error` - Error logs
- `generic` - Fallback/unknown format

### Severity Tags
- `high_priority` - Fatal/error level logs
- `error` - Error messages
- `warning` - Warning messages

### HTTP Status Tags
- `http_2xx`, `success` - Successful requests
- `http_3xx`, `redirect` - Redirects
- `http_4xx`, `client_error` - Client errors (bad request, not found, etc.)
- `http_5xx`, `server_error` - Server errors

### Failure Tags
- `_grokparsefailure_nginx_access` - Failed to parse Nginx access log
- `_grokparsefailure_nginx_error` - Failed to parse Nginx error log
- `_grokparsefailure_generic` - Failed to parse generic log
- `_dateparsefailure` - Failed to parse timestamp

---

## 🎯 **Usage Examples**

### Kibana Query Examples

**Find all errors:**
```
tags:error OR severity:high
```

**Find 5xx errors:**
```
tags:http_5xx
```

**Find slow requests (>1s):**
```
response_time_ms:>1000
```

**Find failed authentication:**
```
http_status_code:401 OR http_status_code:403
```

**Find Nginx errors:**
```
service:travelnest-nginx AND log_type:error
```

**Find API errors:**
```
service:travelnest-api AND tags:error
```

**Find requests from specific country:**
```
geoip.country_name:"United States"
```

---

## 🚨 **Known Limitations**

1. **GeoIP Database Required**
   - The `geoip` filter requires GeoIP database
   - May need to install maxmind database
   - See: https://www.elastic.co/guide/en/logstash/current/plugins-filters-geoip.html

2. **Pino Numeric Level Detection**
   - Assumes numeric strings are Pino levels
   - May misclassify if other loggers use numeric levels differently

3. **Field Name Conflicts**
   - Creates both `http_status_code` and `statusCode` for compatibility
   - Slight storage overhead, but ensures backward compatibility

4. **Nginx Custom Log Formats**
   - Only supports standard "combined" format for access logs
   - Custom nginx log formats may need pattern adjustments

---

## 🔍 **Testing & Validation**

### Test Logstash Configuration
```bash
# On VPS
docker exec travelnest-logstash \
  /usr/share/logstash/bin/logstash --config.test_and_exit \
  -f /usr/share/logstash/pipeline/logstash.conf
```

### Check Logstash Logs
```bash
docker logs travelnest-logstash --tail 100
```

### Monitor Pipeline Stats
```bash
curl http://localhost:9600/_node/stats/pipelines?pretty
```

### Test with Sample Log
Create a test file `/tmp/test.json`:
```json
{"level":50,"time":1678450800000,"msg":"Test error","requestId":"abc123","statusCode":500,"responseTime":1234.5}
```

---

## 📝 **Deployment Checklist**

- [ ] Backup current configuration
- [ ] Update logstash.conf on VPS
- [ ] Test configuration syntax
- [ ] Restart Logstash container
- [ ] Monitor Logstash logs for errors
- [ ] Check Elasticsearch indices for new logs
- [ ] Verify field types in Kibana
- [ ] Test Kibana queries with new fields
- [ ] Monitor for parsing failures (check failure tags)

---

## 🔄 **Next Steps**

1. **Deploy to VPS**:
   ```bash
   scp configs/logstash/pipeline/logstash.conf user@vps:/opt/travelnest/logstash/pipeline/
   docker restart travelnest-logstash
   ```

2. **Monitor for 24 hours**
   - Check for `_grokparsefailure` tags
   - Verify all log types are parsed correctly
   - Check field types in Elasticsearch

3. **Optional Enhancements**:
   - Add anonymization for sensitive fields (IPs, user IDs)
   - Add rate limiting alerts for high error rates
   - Configure dead letter queue for failed events
   - Add user agent parsing for better analytics

---

## 📚 **References**

- [Logstash Filter Plugins](https://www.elastic.co/guide/en/logstash/current/filter-plugins.html)
- [Grok Patterns](https://github.com/logstash-plugins/logstash-patterns-core/tree/main/patterns)
- [Date Filter](https://www.elastic.co/guide/en/logstash/current/plugins-filters-date.html)
- [Mutate Filter](https://www.elastic.co/guide/en/logstash/current/plugins-filters-mutate.html)
- [GeoIP Filter](https://www.elastic.co/guide/en/logstash/current/plugins-filters-geoip.html)
