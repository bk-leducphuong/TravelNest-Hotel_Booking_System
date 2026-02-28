# Complete VPS Setup Guide for TravelNest (Updated)

This guide includes ALL components needed based on your actual development infrastructure.

## Missing Components from Original Guide

Your backend requires these additional components:
- ✅ **ELK Stack** (Elasticsearch, Logstash, Kibana, Filebeat) for centralized logging
- ✅ **ClickHouse initialization scripts** for analytics tables
- ✅ **Elasticsearch initialization** for hotel search index
- ✅ **Configuration files** for Filebeat, Logstash, Elasticsearch

---

## 1. Enhanced Directory Structure

```bash
# Create complete directory structure
cd /opt/travelnest

mkdir -p {logs,backups,data,nginx,releases,elasticsearch,logstash,filebeat,clickhouse}

# Subdirectories
mkdir -p nginx/{conf.d,html/{user,admin}}
mkdir -p data/{mysql,redis,elasticsearch,clickhouse,minio}
mkdir -p backups/{mysql,redis,elasticsearch}
mkdir -p releases/{user-client,admin-client,api}
mkdir -p logs/{nginx,api,mysql,elasticsearch,logstash}

# ELK stack configurations
mkdir -p elasticsearch/{config,mapping,setup}
mkdir -p logstash/{config,pipeline}
mkdir -p filebeat/config

# ClickHouse initialization
mkdir -p clickhouse/init

# Set proper permissions
chmod -R 755 /opt/travelnest
chmod -R 777 /opt/travelnest/logs
chmod -R 700 /opt/travelnest/data/mysql
chmod -R 755 /opt/travelnest/data/elasticsearch
chown -R 1000:1000 /opt/travelnest/data/elasticsearch  # Elasticsearch requires UID 1000
```

**Complete Directory Structure:**

```
/opt/travelnest/
├── docker-compose.yml
├── .env
├── nginx/
│   ├── nginx.conf
│   ├── conf.d/
│   │   ├── user-client.conf
│   │   ├── admin-client.conf
│   │   ├── api.conf
│   │   └── kibana.conf (optional)
│   └── html/
│       ├── user/
│       └── admin/
├── elasticsearch/
│   ├── config/
│   │   └── elasticsearch.yml
│   ├── mapping/
│   │   ├── hotels-mapping.json
│   │   └── logs-mapping.json
│   └── setup/
│       ├── setup-hotels-index.js
│       └── setup-logs-index.js
├── logstash/
│   ├── config/
│   │   └── logstash.yml
│   └── pipeline/
│       └── logstash.conf
├── filebeat/
│   └── filebeat.yml
├── clickhouse/
│   └── init/
│       └── 01-create-search-logs.sql
├── data/
│   ├── mysql/
│   ├── redis/
│   ├── elasticsearch/
│   ├── clickhouse/
│   └── minio/
├── logs/
│   ├── nginx/
│   ├── api/
│   ├── elasticsearch/
│   └── logstash/
├── backups/
│   ├── mysql/
│   ├── redis/
│   └── elasticsearch/
└── releases/
    ├── user-client/
    ├── admin-client/
    └── api/
```

---

## 2. Environment Variables (.env)

```bash
nano /opt/travelnest/.env
```

```bash
# ===========================================
# TravelNest Production Environment
# ===========================================

# ---------- Application ----------
NODE_ENV=production
APP_PORT=3000
API_URL=https://api.deployserver.work
USER_CLIENT_URL=https://deployserver.work
ADMIN_CLIENT_URL=https://admin.deployserver.work

# ---------- Database ----------
DB_HOST=mysql
DB_PORT=3306
DB_NAME=travelnest
DB_USER=travelnest_user
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_123!

# ---------- Redis ----------
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD

# ---------- Session & JWT ----------
SESSION_SECRET=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING
SESSION_SECRET_KEY=CHANGE_THIS_TO_ANOTHER_RANDOM_STRING
JWT_SECRET=CHANGE_THIS_TO_RANDOM_JWT_SECRET
JWT_EXPIRES_IN=7d

# ---------- MinIO (S3-compatible storage) ----------
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=CHANGE_THIS_MINIO_ACCESS_KEY
MINIO_SECRET_KEY=CHANGE_THIS_MINIO_SECRET_KEY_MIN_32_CHARS
MINIO_USE_SSL=false

# ---------- ClickHouse (Analytics) ----------
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=travelnest
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=CHANGE_THIS_CLICKHOUSE_PASSWORD

# ---------- Elasticsearch (Search & Logging) ----------
ELASTICSEARCH_NODE=http://elasticsearch:9200
ELASTICSEARCH_HOSTS=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=CHANGE_THIS_ELASTIC_PASSWORD

# Kibana System User (for Kibana to connect to ES)
KIBANA_SYSTEM_PASSWORD=CHANGE_THIS_KIBANA_PASSWORD

# ---------- Docker ----------
COMPOSE_PROJECT_NAME=travelnest
DOCKERHUB_USERNAME=your-dockerhub-username
```

```bash
# Secure the .env file
chmod 600 /opt/travelnest/.env

# Generate strong passwords
openssl rand -base64 32  # For database passwords
openssl rand -hex 64     # For session secrets
openssl rand -base64 48  # For JWT secret
```

---

## 3. Production Docker Compose File

```bash
nano /opt/travelnest/docker-compose.yml
```

```yaml
version: '3.9'

services:
  # ============================================
  # Nginx Reverse Proxy
  # ============================================
  nginx:
    image: nginx:alpine
    container_name: travelnest-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/html:/usr/share/nginx/html:ro
      - ./logs/nginx:/var/log/nginx
    networks:
      - frontend
      - proxy
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================
  # API Server (Node.js Backend)
  # ============================================
  api:
    image: ${DOCKERHUB_USERNAME}/travelnest-api:latest
    container_name: travelnest-api
    restart: unless-stopped
    env_file: .env
    environment:
      - NODE_ENV=production
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - SESSION_SECRET=${SESSION_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - MINIO_ENDPOINT=${MINIO_ENDPOINT}
      - MINIO_PORT=${MINIO_PORT}
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - CLICKHOUSE_HOST=${CLICKHOUSE_HOST}
      - CLICKHOUSE_DATABASE=${CLICKHOUSE_DATABASE}
      - ELASTICSEARCH_NODE=${ELASTICSEARCH_NODE}
      - ELASTICSEARCH_USERNAME=${ELASTICSEARCH_USERNAME}
      - ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}
    ports:
      - "3000:3000"
    volumes:
      - ./logs/api:/app/logs
    networks:
      - backend
      - proxy
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy
      clickhouse:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ============================================
  # MySQL Database
  # ============================================
  mysql:
    image: mysql:8.0
    container_name: travelnest-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./data/mysql:/var/lib/mysql
      - ./backups/mysql:/backups
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h localhost -u ${DB_USER} -p${DB_PASSWORD}"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ============================================
  # Redis Cache
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: travelnest-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - ./data/redis:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ============================================
  # Elasticsearch (Search & Logs)
  # ============================================
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.3
    container_name: travelnest-elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - ELASTIC_PASSWORD=${ELASTICSEARCH_PASSWORD}
      - xpack.security.enabled=true
      - xpack.security.http.ssl.enabled=false
      - cluster.routing.allocation.disk.threshold_enabled=true
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - ./data/elasticsearch:/usr/share/elasticsearch/data
      - ./elasticsearch/config/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml:ro
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "curl -u elastic:${ELASTICSEARCH_PASSWORD} -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ============================================
  # Kibana (Log Visualization)
  # ============================================
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.3
    container_name: travelnest-kibana
    restart: unless-stopped
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=kibana_system
      - ELASTICSEARCH_PASSWORD=${KIBANA_SYSTEM_PASSWORD}
    ports:
      - "5601:5601"
    networks:
      - backend
    depends_on:
      elasticsearch:
        condition: service_healthy

  # ============================================
  # Logstash (Log Processing)
  # ============================================
  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.3
    container_name: travelnest-logstash
    restart: unless-stopped
    environment:
      - "LS_JAVA_OPTS=-Xms512m -Xmx512m"
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=${ELASTICSEARCH_USERNAME}
      - ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}
    volumes:
      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
      - ./logstash/pipeline:/usr/share/logstash/pipeline:ro
    ports:
      - "5044:5044"
    networks:
      - backend
    depends_on:
      elasticsearch:
        condition: service_healthy

  # ============================================
  # Filebeat (Log Shipper)
  # ============================================
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.3
    container_name: travelnest-filebeat
    restart: unless-stopped
    user: root
    environment:
      - ELASTICSEARCH_USERNAME=${ELASTICSEARCH_USERNAME}
      - ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./logs:/logs:ro
    command: filebeat -e -strict.perms=false
    networks:
      - backend
    depends_on:
      - logstash

  # ============================================
  # ClickHouse (Analytics)
  # ============================================
  clickhouse:
    image: clickhouse/clickhouse-server:24.3-alpine
    container_name: travelnest-clickhouse
    restart: unless-stopped
    environment:
      CLICKHOUSE_DB: ${CLICKHOUSE_DATABASE}
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: 1
      CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD}
    volumes:
      - ./data/clickhouse:/var/lib/clickhouse
      - ./clickhouse/init:/docker-entrypoint-initdb.d:ro
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    networks:
      - backend
    healthcheck:
      test: ["CMD", "clickhouse-client", "--query", "SELECT 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ============================================
  # MinIO (S3-compatible Object Storage)
  # ============================================
  minio:
    image: minio/minio:latest
    container_name: travelnest-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - ./data/minio:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

# ============================================
# Networks
# ============================================
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
  proxy:
    driver: bridge

# ============================================
# Volumes
# ============================================
volumes:
  mysql_data:
  redis_data:
  elasticsearch_data:
  clickhouse_data:
  minio_data:
```

---

## 4. Elasticsearch Configuration

### elasticsearch.yml

```bash
nano /opt/travelnest/elasticsearch/config/elasticsearch.yml
```

```yaml
cluster.name: travelnest-cluster
node.name: travelnest-node-1

# Network
network.host: 0.0.0.0
http.port: 9200

# Discovery
discovery.type: single-node

# Security
xpack.security.enabled: true
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false

# Monitoring
xpack.monitoring.collection.enabled: true

# Path
path.data: /usr/share/elasticsearch/data
path.logs: /usr/share/elasticsearch/logs

# Memory
bootstrap.memory_lock: true

# Cluster settings
cluster.routing.allocation.disk.threshold_enabled: true
cluster.routing.allocation.disk.watermark.low: 85%
cluster.routing.allocation.disk.watermark.high: 90%
cluster.routing.allocation.disk.watermark.flood_stage: 95%
```

### Hotels Index Mapping

```bash
nano /opt/travelnest/elasticsearch/mapping/hotels-mapping.json
```

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "hotel_name_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "edge_ngram_filter"]
        },
        "city_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      },
      "filter": {
        "edge_ngram_filter": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "hotel_id": { "type": "keyword" },
      "hotel_name": {
        "type": "text",
        "analyzer": "hotel_name_analyzer",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "city": {
        "type": "text",
        "analyzer": "city_analyzer",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "country": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "latitude": { "type": "scaled_float", "scaling_factor": 10000000 },
      "longitude": { "type": "scaled_float", "scaling_factor": 10000000 },
      "min_price": { "type": "scaled_float", "scaling_factor": 100 },
      "max_price": { "type": "scaled_float", "scaling_factor": 100 },
      "avg_rating": { "type": "scaled_float", "scaling_factor": 100 },
      "review_count": { "type": "integer" },
      "hotel_class": { "type": "byte" },
      "status": { "type": "keyword" },
      "amenity_codes": { "type": "keyword" },
      "has_free_cancellation": { "type": "boolean" },
      "is_available": { "type": "boolean" },
      "has_available_rooms": { "type": "boolean" },
      "primary_image_url": { "type": "keyword", "index": false },
      "total_bookings": { "type": "integer" },
      "view_count": { "type": "integer" },
      "popularity_score": { "type": "rank_feature" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}
```

---

## 5. Logstash Configuration

### logstash.yml

```bash
nano /opt/travelnest/logstash/config/logstash.yml
```

```yaml
http.host: "0.0.0.0"
xpack.monitoring.elasticsearch.hosts: ["http://elasticsearch:9200"]
xpack.monitoring.enabled: true
```

### logstash.conf (Pipeline)

```bash
nano /opt/travelnest/logstash/pipeline/logstash.conf
```

```conf
input {
  beats {
    port => 5044
    host => "0.0.0.0"
  }
}

filter {
  # Parse JSON logs
  if [message] =~ /^\{.*\}$/ {
    json {
      source => "message"
      target => "parsed"
    }
    
    # Extract fields from parsed JSON
    if [parsed] {
      mutate {
        add_field => {
          "log_level" => "%{[parsed][level]}"
          "timestamp" => "%{[parsed][timestamp]}"
          "service_name" => "%{[parsed][service]}"
          "error_message" => "%{[parsed][message]}"
          "error_stack" => "%{[parsed][stack]}"
          "request_id" => "%{[parsed][requestId]}"
          "user_id" => "%{[parsed][userId]}"
          "method" => "%{[parsed][method]}"
          "url" => "%{[parsed][url]}"
          "status_code" => "%{[parsed][statusCode]}"
          "response_time" => "%{[parsed][responseTime]}"
        }
      }
    }
  }

  # Grok pattern for non-JSON logs
  else {
    grok {
      match => { 
        "message" => "%{TIMESTAMP_ISO8601:timestamp} \\[%{LOGLEVEL:log_level}\\] %{GREEDYDATA:log_message}" 
      }
    }
  }

  # Parse timestamp
  date {
    match => [ "timestamp", "ISO8601", "yyyy-MM-dd HH:mm:ss" ]
    target => "@timestamp"
  }

  # Classify error severity
  if [log_level] == "error" or [log_level] == "fatal" {
    mutate {
      add_tag => ["error"]
      add_field => { "severity" => "high" }
    }
  } else if [log_level] == "warn" {
    mutate {
      add_tag => ["warning"]
      add_field => { "severity" => "medium" }
    }
  } else {
    mutate {
      add_field => { "severity" => "low" }
    }
  }

  # Add hostname
  mutate {
    add_field => { "hostname" => "%{[host][name]}" }
  }

  # Remove unnecessary fields
  mutate {
    remove_field => ["parsed", "agent", "ecs", "input", "log"]
  }
}

output {
  elasticsearch {
    hosts => ["${ELASTICSEARCH_HOSTS:http://elasticsearch:9200}"]
    user => "${ELASTICSEARCH_USERNAME:elastic}"
    password => "${ELASTICSEARCH_PASSWORD}"
    index => "travelnest-logs-%{+YYYY.MM.dd}"
  }
}
```

---

## 6. Filebeat Configuration

```bash
nano /opt/travelnest/filebeat/filebeat.yml
```

```yaml
filebeat.inputs:
  # Application logs
  - type: log
    enabled: true
    paths:
      - /logs/*.log
      - /logs/**/*.log
    fields:
      service: travelnest-server
      environment: production
    fields_under_root: true
    json.keys_under_root: true
    json.add_error_key: true
    json.message_key: message
    multiline.pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
    multiline.negate: true
    multiline.match: after

  # Error logs
  - type: log
    enabled: true
    paths:
      - /logs/error.log
    fields:
      service: travelnest-server
      log_type: error
      environment: production
    fields_under_root: true

  # Access logs
  - type: log
    enabled: true
    paths:
      - /logs/access.log
    fields:
      service: travelnest-server
      log_type: access
      environment: production
    fields_under_root: true

  # Docker container logs
  - type: container
    enabled: true
    paths:
      - '/var/lib/docker/containers/*/*.log'
    processors:
      - add_docker_metadata:
          host: 'unix:///var/run/docker.sock'

# Processors
processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~

# General
name: travelnest-filebeat
tags: ['travelnest', 'production', 'nodejs']

# Output to Logstash
output.logstash:
  hosts: ['logstash:5044']
  compression_level: 3
  worker: 2
  bulk_max_size: 2048

# Kibana
setup.kibana:
  host: 'kibana:5601'

# Logging
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644

# Monitoring
monitoring.enabled: true
monitoring.elasticsearch:
  hosts: ['elasticsearch:9200']
  username: '${ELASTICSEARCH_USERNAME:elastic}'
  password: '${ELASTICSEARCH_PASSWORD}'
```

---

## 7. ClickHouse Initialization

```bash
nano /opt/travelnest/clickhouse/init/01-create-search-logs.sql
```

```sql
-- ============================================================================
-- ClickHouse Search Logs Schema
-- ============================================================================

CREATE DATABASE IF NOT EXISTS travelnest;

-- ============================================================================
-- Main table: search_logs (append-only event log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.search_logs
(
    -- Core fields
    search_id       UUID,
    user_id         Nullable(UUID),
    location        String,
    search_time     DateTime DEFAULT now(),
    
    -- Search parameters
    adults          UInt32,
    children        UInt32 DEFAULT 0,
    rooms           UInt32,
    check_in_date   Nullable(Date),
    check_out_date  Nullable(Date),
    
    -- Computed: nights duration
    nights          UInt32 DEFAULT dateDiff('day', check_in_date, check_out_date),
    
    -- Soft delete support
    is_deleted      UInt8 DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(search_time)
ORDER BY (location, search_time, search_id)
TTL search_time + INTERVAL 2 YEAR;

-- ============================================================================
-- Materialized View 1: Popular destinations (demand analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.mv_popular_destinations
(
    location        String,
    date            Date,
    search_count    UInt64,
    unique_users    UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (location, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_popular_destinations_mv
TO travelnest.mv_popular_destinations
AS
SELECT
    location,
    toDate(search_time) as date,
    count() as search_count,
    uniqExact(user_id) as unique_users
FROM travelnest.search_logs
WHERE is_deleted = 0
GROUP BY location, date;

-- ============================================================================
-- Materialized View 2: Search patterns by travel dates
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.mv_demand_by_travel_date
(
    check_in_date   Date,
    location        String,
    search_count    UInt64,
    avg_nights      Float64,
    avg_rooms       Float64,
    avg_guests      Float64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(check_in_date)
ORDER BY (check_in_date, location);

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_demand_by_travel_date_mv
TO travelnest.mv_demand_by_travel_date
AS
SELECT
    check_in_date,
    location,
    count() as search_count,
    avg(nights) as avg_nights,
    avg(rooms) as avg_rooms,
    avg(adults + children) as avg_guests
FROM travelnest.search_logs
WHERE is_deleted = 0 AND check_in_date IS NOT NULL
GROUP BY check_in_date, location;

-- ============================================================================
-- Materialized View 3: User search history
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.mv_user_search_summary
(
    user_id             UUID,
    total_searches      UInt64,
    unique_locations    UInt64,
    locations_visited   Array(String),
    last_search_time    DateTime,
    first_search_time   DateTime
)
ENGINE = AggregatingMergeTree()
ORDER BY user_id;

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_user_search_summary_mv
TO travelnest.mv_user_search_summary
AS
SELECT
    user_id,
    count() as total_searches,
    uniqExact(location) as unique_locations,
    groupArray(location) as locations_visited,
    max(search_time) as last_search_time,
    min(search_time) as first_search_time
FROM travelnest.search_logs
WHERE is_deleted = 0 AND user_id IS NOT NULL
GROUP BY user_id;

-- ============================================================================
-- Materialized View 4: Peak search times
-- ============================================================================
CREATE TABLE IF NOT EXISTS travelnest.mv_search_time_patterns
(
    hour_of_day     UInt8,
    day_of_week     UInt8,
    search_count    UInt64
)
ENGINE = SummingMergeTree()
ORDER BY (day_of_week, hour_of_day);

CREATE MATERIALIZED VIEW IF NOT EXISTS travelnest.mv_search_time_patterns_mv
TO travelnest.mv_search_time_patterns
AS
SELECT
    toHour(search_time) as hour_of_day,
    toDayOfWeek(search_time) as day_of_week,
    count() as search_count
FROM travelnest.search_logs
WHERE is_deleted = 0
GROUP BY hour_of_day, day_of_week;
```

---

## 8. Initialization Scripts

### Setup Kibana User

```bash
nano /opt/travelnest/setup-kibana-user.sh
```

```bash
#!/usr/bin/env bash
# One-time setup: set password for kibana_system user
set -e
cd "$(dirname "$0")"
source .env

ES_URL="http://localhost:9200"
ELASTIC_PASS="${ELASTICSEARCH_PASSWORD:?Set ELASTICSEARCH_PASSWORD in .env}"
KIBANA_PASS="${KIBANA_SYSTEM_PASSWORD:?Set KIBANA_SYSTEM_PASSWORD in .env}"

echo "Waiting for Elasticsearch to be ready..."
until curl -s -u "elastic:${ELASTIC_PASS}" "${ES_URL}/_cluster/health" > /dev/null; do
  echo "Waiting..."
  sleep 5
done

echo "Setting kibana_system password..."
curl -s -u "elastic:${ELASTIC_PASS}" -X POST "${ES_URL}/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"${KIBANA_PASS}\"}"

echo ""
echo "✓ Kibana system user password set successfully!"
```

```bash
chmod +x /opt/travelnest/setup-kibana-user.sh
```

### Setup Hotels Index

```bash
nano /opt/travelnest/setup-hotels-index.sh
```

```bash
#!/usr/bin/env bash
# Setup Elasticsearch hotels index
set -e
cd "$(dirname "$0")"
source .env

ES_URL="http://localhost:9200"
INDEX_NAME="hotels"
MAPPING_FILE="./elasticsearch/mapping/hotels-mapping.json"

echo "Checking if index '${INDEX_NAME}' exists..."
if curl -s -u "elastic:${ELASTICSEARCH_PASSWORD}" "${ES_URL}/${INDEX_NAME}" > /dev/null 2>&1; then
  echo "Index '${INDEX_NAME}' already exists."
  read -p "Delete and recreate? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deleting index..."
    curl -X DELETE -u "elastic:${ELASTICSEARCH_PASSWORD}" "${ES_URL}/${INDEX_NAME}"
  else
    echo "Skipping."
    exit 0
  fi
fi

echo "Creating index '${INDEX_NAME}'..."
curl -X PUT -u "elastic:${ELASTICSEARCH_PASSWORD}" "${ES_URL}/${INDEX_NAME}" \
  -H "Content-Type: application/json" \
  -d @"${MAPPING_FILE}"

echo ""
echo "✓ Index '${INDEX_NAME}' created successfully!"
```

```bash
chmod +x /opt/travelnest/setup-hotels-index.sh
```

---

## 9. First-Time Setup Commands

After creating all files, run these commands **in order**:

```bash
cd /opt/travelnest

# 1. Set proper ownership for Elasticsearch data
sudo chown -R 1000:1000 ./data/elasticsearch

# 2. Start core services first (without ELK stack)
docker compose up -d mysql redis clickhouse minio

# Wait for them to be healthy
docker compose ps

# 3. Start Elasticsearch
docker compose up -d elasticsearch

# Wait for Elasticsearch to be healthy (check logs)
docker compose logs -f elasticsearch

# 4. Setup Kibana system user (Ctrl+C after ES is ready)
./setup-kibana-user.sh

# 5. Start remaining ELK components
docker compose up -d kibana logstash filebeat

# 6. Start API and Nginx
docker compose up -d api nginx

# 7. Verify all services are running
docker compose ps

# 8. Setup Elasticsearch hotels index
./setup-hotels-index.sh

# 9. Verify ClickHouse tables were created
docker exec -it travelnest-clickhouse clickhouse-client --query "SHOW TABLES FROM travelnest"
```

---

## 10. Post-Deployment Verification

```bash
# Check all containers are healthy
docker compose ps

# Check Elasticsearch cluster health
curl -u elastic:YOUR_PASSWORD http://localhost:9200/_cluster/health?pretty

# Check ClickHouse tables
docker exec travelnest-clickhouse clickhouse-client --query "SELECT name FROM system.tables WHERE database='travelnest'"

# Check Kibana (should see Kibana UI)
curl http://localhost:5601

# Check API health
curl http://localhost:3000/health

# Check logs
docker compose logs -f api
docker compose logs -f elasticsearch
docker compose logs -f logstash
```

---

## 11. Troubleshooting

### Elasticsearch won't start
```bash
# Check permissions
ls -la data/elasticsearch/
sudo chown -R 1000:1000 data/elasticsearch/

# Check vm.max_map_count
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### Kibana can't connect
```bash
# Verify kibana_system password was set
./setup-kibana-user.sh

# Check Kibana logs
docker compose logs kibana
```

### ClickHouse init script didn't run
```bash
# Manually execute
docker exec -i travelnest-clickhouse clickhouse-client --multiquery < clickhouse/init/01-create-search-logs.sql

# Verify
docker exec travelnest-clickhouse clickhouse-client --query "SHOW TABLES FROM travelnest"
```

### Filebeat not shipping logs
```bash
# Check Filebeat logs
docker compose logs filebeat

# Verify log files exist
ls -la logs/

# Check Logstash is receiving
docker compose logs logstash | grep "Pipeline started"
```

---

## Summary of Added Components

Compared to the original guide, this adds:

✅ **ELK Stack** (Elasticsearch + Kibana + Logstash + Filebeat)
- Centralized logging for all application logs
- Log parsing and enrichment via Logstash
- Visualization and search via Kibana

✅ **ClickHouse Initialization**
- Automated table creation on first run
- Materialized views for analytics
- Proper partitioning and TTL

✅ **Elasticsearch Index Setup**
- Hotels search index with proper mappings
- Custom analyzers for search
- Geo-spatial support

✅ **Configuration Files**
- All required config files for ELK components
- Production-ready settings
- Proper security configuration

Your VPS is now **fully configured** to match your development environment! 🚀
