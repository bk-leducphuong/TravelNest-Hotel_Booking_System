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

# Install Docker Compose (if not already installed)
sudo apt install -y docker-compose-plugin

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
mkdir -p {logs,backups,data,nginx,releases}

# Create directory structure
mkdir -p nginx/conf.d
mkdir -p nginx/ssl
mkdir -p nginx/html/user
mkdir -p nginx/html/admin
mkdir -p data/{mysql,redis,elasticsearch,clickhouse,minio}
mkdir -p backups/{mysql,redis,elasticsearch}
mkdir -p releases/{user-client,admin-client,api}

# Set proper permissions
chmod -R 755 /opt/travelnest
chmod -R 777 /opt/travelnest/logs
chmod -R 700 /opt/travelnest/data/mysql
```

**Directory Structure:**

```
/opt/travelnest/
├── docker-compose.yml           # Main compose file
├── .env                         # Environment variables
├── nginx/
│   ├── nginx.conf               # Main nginx config
│   ├── conf.d/                  # Site configs
│   │   ├── user-client.conf
│   │   ├── admin-client.conf
│   │   └── api.conf
│   └── html/
│       ├── user/                # Vue3 SPA files
│       └── admin/               # Nuxt4 files
├── data/
│   ├── mysql/
│   ├── redis/
│   ├── elasticsearch/
│   ├── clickhouse/
│   └── minio/
├── logs/
│   ├── nginx/
│   ├── api/
│   └── mysql/
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

Add the following (customize values):

```bash
# Application
NODE_ENV=production
APP_PORT=3000

# Database
DB_HOST=mysql
DB_PORT=3306
DB_NAME=travelnest
DB_USER=travelnest_user
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_123!@#

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD

# Session
SESSION_SECRET=CHANGE_THIS_TO_RANDOM_64_CHAR_STRING
SESSION_SECRET_KEY=CHANGE_THIS_TO_ANOTHER_RANDOM_STRING

# JWT
JWT_SECRET=CHANGE_THIS_TO_RANDOM_JWT_SECRET
JWT_EXPIRES_IN=7d

# MinIO (S3-compatible storage)
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=CHANGE_THIS_MINIO_ACCESS_KEY
MINIO_SECRET_KEY=CHANGE_THIS_MINIO_SECRET_KEY_MIN_32_CHARS

# ClickHouse
CLICKHOUSE_HOST=clickhouse
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=travelnest
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=CHANGE_THIS_CLICKHOUSE_PASSWORD

# Elasticsearch
ELASTICSEARCH_NODE=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=CHANGE_THIS_ELASTIC_PASSWORD

# API URLs
API_URL=https://api.deployserver.work
USER_CLIENT_URL=https://deployserver.work
ADMIN_CLIENT_URL=https://admin.deployserver.work

# Docker
COMPOSE_PROJECT_NAME=travelnest
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
version: "3.9"

services:
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

  api:
    image: ${DOCKERHUB_USERNAME}/travelnest-api:latest
    container_name: travelnest-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PORT=${REDIS_PORT}
      - SESSION_SECRET=${SESSION_SECRET}
      - JWT_SECRET=${JWT_SECRET}
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
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:3000/health",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

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
      test:
        [
          "CMD-SHELL",
          "mysqladmin ping -h localhost -u ${DB_USER} -p${DB_PASSWORD}",
        ]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: travelnest-redis
    restart: unless-stopped
    command:
      [
        "redis-server",
        "--appendonly",
        "yes",
        "--requirepass",
        "${REDIS_PASSWORD}",
      ]
    volumes:
      - ./data/redis:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: travelnest-elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - ELASTIC_PASSWORD=${ELASTICSEARCH_PASSWORD}
      - xpack.security.enabled=true
    volumes:
      - ./data/elasticsearch:/usr/share/elasticsearch/data
    networks:
      - backend
    healthcheck:
      test:
        ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

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

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
  proxy:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
  elasticsearch_data:
  clickhouse_data:
  minio_data:
```

</details>

---

## 8. Nginx Configuration

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
docker compose pull mysql redis elasticsearch clickhouse minio nginx

# Start services (without API)
docker compose up -d mysql redis elasticsearch clickhouse minio

# Check status
docker compose ps

# Check logs
docker compose logs -f

# Test database connection
docker exec -it travelnest-mysql mysql -u travelnest_user -p
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
