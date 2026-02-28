# TravelNest Deployment Scripts

Automated deployment setup for TravelNest VPS infrastructure.

## Quick Start

```bash
# 1. Clone this repo on your VPS
git clone <your-repo-url> /tmp/travelnest-deploy
cd /tmp/travelnest-deploy

# 2. Run the main setup script
sudo bash scripts/setup-all.sh

# 3. Edit environment variables
nano /opt/travelnest/.env

# 4. Start services
cd /opt/travelnest
docker compose up -d

# 5. Run post-deployment setup
bash scripts/post-deploy.sh
```

## What Gets Installed

- ✅ System packages (Docker, Git, UFW, Fail2ban, etc.)
- ✅ Complete directory structure
- ✅ Docker Compose configuration
- ✅ Nginx reverse proxy configs
- ✅ ELK Stack (Elasticsearch, Logstash, Kibana, Filebeat)
- ✅ ClickHouse analytics setup
- ✅ MinIO object storage
- ✅ MySQL, Redis
- ✅ Backup scripts and cron jobs
- ✅ Security hardening (firewall, fail2ban)

## Directory Structure

```
/opt/travelnest/
├── docker-compose.yml
├── .env
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
├── elasticsearch/
│   ├── config/
│   └── mapping/
├── logstash/
│   ├── config/
│   └── pipeline/
├── filebeat/
├── clickhouse/
│   └── init/
├── data/
├── logs/
└── backups/
```

## Scripts Overview

| Script | Description |
|--------|-------------|
| `setup-all.sh` | Main orchestrator - runs all setup scripts |
| `01-install-packages.sh` | Install system packages |
| `02-setup-directories.sh` | Create directory structure |
| `03-setup-docker.sh` | Configure Docker and permissions |
| `04-setup-firewall.sh` | Configure UFW firewall |
| `05-deploy-configs.sh` | Copy all config files |
| `post-deploy.sh` | Initialize services after first start |
| `backup-setup.sh` | Setup automated backups |
| `health-check.sh` | Check system health |

## Manual Steps Required

1. **Generate SSH keys** for CI/CD deployment
2. **Configure GitHub Secrets** with SSH keys and Docker Hub credentials
3. **Setup Cloudflare Tunnel** (follow guide in docs/)
4. **Update .env file** with strong passwords
5. **Configure DNS** records in Cloudflare

## Cloudflare Tunnel Setup

```bash
# Install cloudflared
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login and create tunnel
cloudflared tunnel login
cloudflared tunnel create travelnest

# Copy the tunnel config
sudo cp configs/cloudflared/config.yml ~/.cloudflared/config.yml
# Edit it with your tunnel ID

# Install as service
sudo cloudflared service install
sudo systemctl start cloudflared
```

## Troubleshooting

See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Documentation

- [Complete VPS Setup Guide](VPS_SETUP_COMPLETE.md)
- [Infrastructure Overview](INFRA_SETUP.txt)
- [Backup & Recovery](docs/BACKUP.md)
- [Monitoring](docs/MONITORING.md)

## License

[MIT](LICENSE.md)
