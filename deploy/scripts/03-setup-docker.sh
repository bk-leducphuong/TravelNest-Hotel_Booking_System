#!/usr/bin/env bash
################################################################################
# Configure Docker and User Permissions
################################################################################

set -e

REAL_USER="${REAL_USER:-$SUDO_USER}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Configuring Docker..."

# Start and enable Docker service
systemctl start docker
systemctl enable docker

log "Adding user '$REAL_USER' to docker group..."
usermod -aG docker "$REAL_USER"

# Create docker group if it doesn't exist
if ! getent group docker > /dev/null 2>&1; then
    groupadd docker
fi

log "Configuring Docker daemon..."
mkdir -p /etc/docker

# Docker daemon configuration
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "userland-proxy": false,
  "live-restore": true
}
EOF

log "Restarting Docker daemon..."
systemctl daemon-reload
systemctl restart docker

# Verify Docker is working
log "Verifying Docker installation..."
docker run --rm hello-world > /dev/null 2>&1 && log "✓ Docker is working correctly"

# Check Docker Compose
log "Verifying Docker Compose..."
docker compose version

log "✓ Docker configured successfully"
log "NOTE: User '$REAL_USER' must logout and login for group changes to take effect"
