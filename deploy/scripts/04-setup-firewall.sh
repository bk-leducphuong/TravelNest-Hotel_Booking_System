#!/usr/bin/env bash
################################################################################
# Configure UFW Firewall
################################################################################

set -e

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Configuring UFW firewall..."

# Reset firewall rules
ufw --force reset

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (CRITICAL - do this first!)
log "Allowing SSH on port 22..."
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS for Cloudflare Tunnel
log "Allowing HTTP/HTTPS..."
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Optional: Restrict to Cloudflare IPs only
# Uncomment if you want to restrict HTTP/HTTPS to Cloudflare only
# log "Restricting HTTP/HTTPS to Cloudflare IPs..."
# CLOUDFLARE_IPS=(
#     "173.245.48.0/20"
#     "103.21.244.0/22"
#     "103.22.200.0/22"
#     "103.31.4.0/22"
#     "141.101.64.0/18"
#     "108.162.192.0/18"
#     "190.93.240.0/20"
#     "188.114.96.0/20"
#     "197.234.240.0/22"
#     "198.41.128.0/17"
#     "162.158.0.0/15"
#     "104.16.0.0/13"
#     "104.24.0.0/14"
#     "172.64.0.0/13"
#     "131.0.72.0/22"
# )
# 
# for ip in "${CLOUDFLARE_IPS[@]}"; do
#     ufw allow from "$ip" to any port 80 proto tcp comment 'Cloudflare HTTP'
#     ufw allow from "$ip" to any port 443 proto tcp comment 'Cloudflare HTTPS'
# done

# Enable firewall
log "Enabling firewall..."
ufw --force enable

# Show status
log "Firewall status:"
ufw status verbose

log "✓ Firewall configured successfully"
