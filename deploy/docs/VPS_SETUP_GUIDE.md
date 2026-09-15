# VPS Setup Guide for TravelNest

This guide covers everything you need to prepare on your VPS before running the CI/CD pipeline.

## Prerequisites (Already Done ✓)

- ✓ Docker installed
- ✓ Git installed
- ✓ SSH server configured

---

## 1. System Updates & Essential Packages

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  curl \
  wget \
  vim \
  htop \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release \
  ufw \
  fail2ban

# Verify installations
docker --version
docker compose version
git --version
```

---

## 2. User & Permissions Setup

```bash
# Create a dedicated deployment user (optional but recommended)
sudo adduser deploy

# Add deploy user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker deploy

# Add your CI/CD user to docker group if using different user
sudo usermod -aG docker $USER

# Apply group changes (logout and login, or run):
newgrp docker

# Verify docker works without sudo
docker ps
```

---

## 3. Directory Structure Setup

```bash
# Create main application directory
sudo mkdir -p /opt/travelnest
sudo chown -R $USER:$USER /opt/travelnest

# Create subdirectories
cd /opt/travelnest
mkdir -p {logs,backups,data,nginx,releases,elasticsearch,logstash,filebeat,clickhouse}


# Create directory structure
mkdir -p nginx/conf.d
mkdir -p nginx/ssl
mkdir -p nginx/html/user
mkdir -p nginx/html/admin
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
chown -R 1000:1000 /opt/travelnest/data/elasticsearch  
```

**Directory Structure:**

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

## 4. SSH Configuration for CI/CD

```bash
# On your VPS: Generate SSH key for GitHub Actions
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# If using 'deploy' user, do this as deploy user
sudo su - deploy
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your CI/CD public key to authorized_keys
nano ~/.ssh/authorized_keys
# Paste the public key that corresponds to the private key in GitHub Secrets
chmod 600 ~/.ssh/authorized_keys

# Test SSH from your local machine
# ssh deploy@your-vps-ip

# Configure SSH daemon for security
sudo nano /etc/ssh/sshd_config
```

Add/modify these settings in `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers deploy your-username
```

```bash
# Restart SSH service
sudo systemctl restart sshd
```

---

## 5. Firewall Configuration (UFW)

```bash
# Enable UFW
sudo ufw --force enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (for Cloudflare Tunnel)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny all other incoming connections by default
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw reload

# Check status
sudo ufw status verbose
```

**Note:** Since you're using Cloudflare Tunnel, you don't need to expose ports 80/443 publicly. You can restrict them to Cloudflare IPs only:

```bash
# Optional: Restrict to Cloudflare IPs only
# Get Cloudflare IP ranges from: https://www.cloudflare.com/ips/

# Example (update with current Cloudflare IPs):
sudo ufw allow from 173.245.48.0/20 to any port 80 proto tcp
sudo ufw allow from 103.21.244.0/22 to any port 80 proto tcp
# ... add all Cloudflare IP ranges
```

---

## 6. Environment Variables Setup

```bash
# Create .env file
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
chown $USER:$USER /opt/travelnest/.env
```

**IMPORTANT:** Generate strong passwords:

```bash
# Generate random passwords
openssl rand -base64 32  # For database passwords
openssl rand -hex 64     # For session secrets
openssl rand -base64 48  # For JWT secret
```

---

## 7. Docker Compose Production File

Create the production docker-compose file:

```bash
nano /opt/travelnest/docker-compose.yml
```

<details>
<summary>Click to see docker-compose.yml template</summary>

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

</details>

---

## 8. Elasticsearch Configuration

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

## 9. Logstash Configuration

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

## 10. Filebeat Configuration

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

## 11. ClickHouse Initialization

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

## 12. Initialization Scripts

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

## 13. Nginx Configuration

### Main nginx.conf

```bash
nano /opt/travelnest/nginx/nginx.conf
```

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
}
```

### User Client Config

```bash
nano /opt/travelnest/nginx/conf.d/user-client.conf
```

```nginx
server {
    listen 80;
    server_name deployserver.work;

    root /usr/share/nginx/html/user;
    index index.html;

    # Logging
    access_log /var/log/nginx/user-access.log main;
    error_log /var/log/nginx/user-error.log warn;

    # Rate limiting
    limit_req zone=general_limit burst=20 nodelay;
    limit_conn addr 10;

    # Caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Security
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Admin Client Config

```bash
nano /opt/travelnest/nginx/conf.d/admin-client.conf
```

```nginx
server {
    listen 80;
    server_name admin.deployserver.work;

    root /usr/share/nginx/html/admin;
    index index.html;

    # Logging
    access_log /var/log/nginx/admin-access.log main;
    error_log /var/log/nginx/admin-error.log warn;

    # Rate limiting
    limit_req zone=general_limit burst=20 nodelay;
    limit_conn addr 10;

    # Caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }

    # Security
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### API Config

```bash
nano /opt/travelnest/nginx/conf.d/api.conf
```

```nginx
upstream api_backend {
    server api:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name api.deployserver.work;

    # Logging
    access_log /var/log/nginx/api-access.log main;
    error_log /var/log/nginx/api-error.log warn;

    # Rate limiting
    limit_req zone=api_limit burst=20 nodelay;
    limit_conn addr 10;

    # Proxy settings
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://api_backend;
        access_log off;
    }

    # Security
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

---

## 9. Cloudflare Tunnel Setup

```bash
# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login to Cloudflare
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create travelnest

# Note the tunnel ID and credentials path
# Credentials saved to: ~/.cloudflared/<TUNNEL-ID>.json

# Create tunnel configuration
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Add this configuration:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /home/your-user/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: deployserver.work
    service: http://localhost:80
  - hostname: admin.deployserver.work
    service: http://localhost:80
  - hostname: api.deployserver.work
    service: http://localhost:80
  - service: http_status:404
```

```bash
# Install as a service
sudo cloudflared service install

# Start the service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Check status
sudo systemctl status cloudflared
```

**Configure DNS in Cloudflare Dashboard:**

1. Go to Cloudflare Dashboard → Your domain
2. Navigate to DNS settings
3. Add CNAME records:
   - `deployserver.work` → `<TUNNEL-ID>.cfargotunnel.com`
   - `admin.deployserver.work` → `<TUNNEL-ID>.cfargotunnel.com`
   - `api.deployserver.work` → `<TUNNEL-ID>.cfargotunnel.com`

---

## 10. Backup Scripts

### MySQL Backup Script

```bash
nano /opt/travelnest/backups/mysql-backup.sh
```

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/opt/travelnest/backups/mysql"
CONTAINER_NAME="travelnest-mysql"
DB_NAME="travelnest"
DB_USER="travelnest_user"
DB_PASSWORD="YOUR_DB_PASSWORD"  # Use same as .env
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/travelnest_$(date +%Y%m%d_%H%M%S).sql.gz"

# Perform backup
echo "Starting MySQL backup..."
docker exec "$CONTAINER_NAME" mysqldump \
  -u"$DB_USER" \
  -p"$DB_PASSWORD" \
  "$DB_NAME" \
  | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    echo "Backup completed: $BACKUP_FILE"
    echo "Backup size: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo "Backup failed!"
    exit 1
fi

# Remove old backups
echo "Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "travelnest_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup process completed successfully!"
```

```bash
chmod +x /opt/travelnest/backups/mysql-backup.sh
```

### Setup Cron Job for Automated Backups

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /opt/travelnest/backups/mysql-backup.sh >> /opt/travelnest/logs/backup.log 2>&1
```

---

## 11. Monitoring Scripts

### Health Check Script

```bash
nano /opt/travelnest/health-check.sh
```

```bash
#!/bin/bash

echo "=== TravelNest Health Check ==="
echo "Date: $(date)"
echo ""

# Check Docker
echo "Docker Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check disk usage
echo "Disk Usage:"
df -h | grep -E "^/dev|Filesystem"
echo ""

# Check memory
echo "Memory Usage:"
free -h
echo ""

# Check CPU
echo "CPU Load:"
uptime
echo ""

# Check container health
echo "Container Health:"
for container in travelnest-nginx travelnest-api travelnest-mysql travelnest-redis; do
    health=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "N/A")
    echo "$container: $health"
done
echo ""

# Check logs for errors (last 10 lines)
echo "Recent errors in API logs:"
docker logs travelnest-api --tail 10 2>&1 | grep -i error || echo "No errors found"
```

```bash
chmod +x /opt/travelnest/health-check.sh
```

---

## 12. Log Rotation Setup

```bash
sudo nano /etc/logrotate.d/travelnest
```

```
/opt/travelnest/logs/*/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0644 nginx nginx
    sharedscripts
    postrotate
        docker exec travelnest-nginx nginx -s reopen 2>/dev/null || true
    endscript
}
```

---

## 13. Security Hardening

### Fail2Ban Configuration

```bash
# Install fail2ban (already installed in step 1)
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create custom jail for nginx
sudo nano /etc/fail2ban/jail.d/travelnest.conf
```

```ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /opt/travelnest/logs/nginx/*-error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /opt/travelnest/logs/nginx/*-error.log
maxretry = 10

[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
```

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

---

## 14. Pre-Deployment Checklist

Before running your first CI/CD pipeline:

- [ ] All directories created with correct permissions
- [ ] `.env` file created with strong passwords
- [ ] Docker and Docker Compose working without sudo
- [ ] SSH key authentication configured
- [ ] Firewall (UFW) configured and enabled
- [ ] Cloudflare Tunnel installed and configured
- [ ] DNS records pointing to Cloudflare Tunnel
- [ ] Nginx configuration files in place
- [ ] Docker Compose file created
- [ ] Backup scripts created and tested
- [ ] Cron jobs configured for backups
- [ ] Fail2ban configured and running
- [ ] Health check script working
- [ ] Log rotation configured
- [ ] GitHub Secrets configured (SSH key, Docker Hub credentials)

---

## 15. Test Your Setup

### Test Docker Compose

```bash
cd /opt/travelnest

# Pull images (without API yet)
docker compose pull mysql redis elasticsearch clickhouse minio nginx elasticsearch filebeat logstash kibana

# Start services (without API)
docker compose up -d mysql redis elasticsearch clickhouse minio elasticsearch filebeat logstash kibana

# Check status
docker compose ps

# Check logs
docker compose logs -f

#. Setup Kibana system user (Ctrl+C after ES is ready)
./setup-kibana-user.sh

# Test database connection
docker exec -it travelnest-mysql mysql -u travelnest_user -p

# Setup Elasticsearch hotels index
./setup-hotels-index.sh

# Verify ClickHouse tables were created
docker exec -it travelnest-clickhouse clickhouse-client --query "SHOW TABLES FROM travelnest"
```

### Test Nginx (with placeholder HTML)

```bash
# Create placeholder pages
echo "<h1>User Client</h1>" > /opt/travelnest/nginx/html/user/index.html
echo "<h1>Admin Client</h1>" > /opt/travelnest/nginx/html/admin/index.html

# Start nginx
docker compose up -d nginx

# Test locally
curl http://localhost
```

### Test Cloudflare Tunnel

```bash
# Check tunnel status
sudo systemctl status cloudflared

# Test from external machine
curl https://deployserver.work
curl https://admin.deployserver.work
```

---

## 16. GitHub Secrets to Configure

In your GitHub repository, go to Settings → Secrets and variables → Actions, and add:

1. **SSH_PRIVATE_KEY** - Private SSH key for deployment
2. **SSH_HOST** - Your VPS IP address
3. **SSH_USER** - Deployment user (e.g., `deploy`)
4. **SSH_PORT** - SSH port (usually `22`)
5. **DOCKERHUB_USERNAME** - Docker Hub username
6. **DOCKERHUB_TOKEN** - Docker Hub access token
7. **ENV_FILE** - Contents of your `.env` file (for secure transfer)

---

## 17. Quick Setup Script

For convenience, here's a script that automates most of the setup:

```bash
nano /tmp/vps-setup.sh
```

```bash
#!/bin/bash
set -e

echo "=== TravelNest VPS Setup Script ==="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create directory structure
echo -e "${GREEN}Creating directory structure...${NC}"
sudo mkdir -p /opt/travelnest
sudo chown -R $USER:$USER /opt/travelnest
cd /opt/travelnest

mkdir -p {logs/{nginx,api,mysql},backups/{mysql,redis,elasticsearch},data/{mysql,redis,elasticsearch,clickhouse,minio},nginx/{conf.d,html/{user,admin}},releases/{user-client,admin-client,api}}

# Set permissions
chmod -R 755 /opt/travelnest
chmod -R 777 /opt/travelnest/logs
chmod -R 700 /opt/travelnest/data/mysql

echo -e "${GREEN}✓ Directory structure created${NC}"

# Add user to docker group
echo -e "${GREEN}Adding user to docker group...${NC}"
sudo usermod -aG docker $USER

echo -e "${GREEN}✓ User added to docker group${NC}"

# Configure UFW
echo -e "${GREEN}Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw reload

echo -e "${GREEN}✓ Firewall configured${NC}"

# Enable fail2ban
echo -e "${GREEN}Enabling fail2ban...${NC}"
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo -e "${GREEN}✓ Fail2ban enabled${NC}"

# Generate sample .env
echo -e "${GREEN}Creating sample .env file...${NC}"
cat > /opt/travelnest/.env.sample << 'EOF'
NODE_ENV=production
APP_PORT=3000

DB_HOST=mysql
DB_PORT=3306
DB_NAME=travelnest
DB_USER=travelnest_user
DB_PASSWORD=CHANGE_ME

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME

SESSION_SECRET=CHANGE_ME
SESSION_SECRET_KEY=CHANGE_ME

JWT_SECRET=CHANGE_ME
JWT_EXPIRES_IN=7d

MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=CHANGE_ME
MINIO_SECRET_KEY=CHANGE_ME

CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=travelnest
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=CHANGE_ME

DOCKERHUB_USERNAME=your-dockerhub-username
EOF

chmod 600 /opt/travelnest/.env.sample

echo -e "${YELLOW}⚠ Please copy .env.sample to .env and update all passwords!${NC}"
echo -e "${YELLOW}  cp /opt/travelnest/.env.sample /opt/travelnest/.env${NC}"
echo -e "${YELLOW}  nano /opt/travelnest/.env${NC}"

echo ""
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "Next steps:"
echo "1. Copy and edit .env file"
echo "2. Create docker-compose.yml"
echo "3. Create nginx configuration files"
echo "4. Install and configure Cloudflare Tunnel"
echo "5. Configure GitHub Secrets"
echo ""
echo "Logout and login again to apply docker group changes."
```

```bash
chmod +x /tmp/vps-setup.sh
/tmp/vps-setup.sh
```

---

## Summary

Your VPS is now ready for CI/CD deployment when you have:

1. ✅ System packages installed
2. ✅ User permissions configured
3. ✅ Directory structure created
4. ✅ SSH authentication configured
5. ✅ Firewall configured
6. ✅ Environment variables set
7. ✅ Docker Compose file created
8. ✅ Nginx configurations in place
9. ✅ Cloudflare Tunnel configured
10. ✅ Backup automation configured
11. ✅ Monitoring scripts in place
12. ✅ Security hardening applied

Once complete, your CI/CD pipeline can:

- SSH into the server
- Pull Docker images from Docker Hub
- Update `docker-compose.yml` if needed
- Run `docker compose pull` and `docker compose up -d`
- Deploy static files to nginx directories
- Perform health checks

**You're ready to deploy! 🚀**
