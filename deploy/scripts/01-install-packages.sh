#!/usr/bin/env bash
################################################################################
# Install Required System Packages
################################################################################

set -e

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Updating system packages..."
apt update

log "Upgrading existing packages..."
apt upgrade -y

log "Installing essential packages..."
apt install -y \
    curl \
    wget \
    vim \
    nano \
    htop \
    git \
    unzip \
    zip \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    build-essential

log "Installing Docker..."
# Remove old versions
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

log "Installing security packages..."
apt install -y \
    ufw \
    fail2ban

log "Installing monitoring tools..."
apt install -y \
    iotop \
    iftop \
    ncdu \
    sysstat

log "Installing network tools..."
apt install -y \
    net-tools \
    dnsutils \
    telnet \
    traceroute

log "Cleaning up..."
apt autoremove -y
apt clean

# Verify installations
log "Verifying installations..."
docker --version
docker compose version
git --version

log "✓ All packages installed successfully"
