#!/usr/bin/env bash
################################################################################
# TravelNest VPS Setup - Main Orchestrator Script
# 
# This script runs all setup scripts in the correct order to prepare
# a fresh VPS for TravelNest deployment.
#
# Usage: sudo bash setup-all.sh
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Log function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Welcome message
clear
log_section "TravelNest VPS Setup - Automated Installation"
log "This script will set up your VPS for TravelNest deployment"
log "Installation path: /opt/travelnest"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Installation cancelled."
    exit 0
fi

# Get the non-root user who invoked sudo
REAL_USER="${SUDO_USER:-$USER}"
log "Running as: root"
log "Target user: $REAL_USER"

# Export for child scripts
export REAL_USER
export SCRIPT_DIR
export PROJECT_ROOT

# Start time
START_TIME=$(date +%s)

################################################################################
# Step 1: Install System Packages
################################################################################
log_section "Step 1: Installing System Packages"
bash "$SCRIPT_DIR/01-install-packages.sh"
log "✓ System packages installed"

################################################################################
# Step 2: Setup Docker
################################################################################
log_section "Step 2: Configuring Docker"
bash "$SCRIPT_DIR/03-setup-docker.sh"
log "✓ Docker configured"

################################################################################
# Step 3: Setup Directory Structure
################################################################################
log_section "Step 3: Creating Directory Structure"
bash "$SCRIPT_DIR/02-setup-directories.sh"
log "✓ Directory structure created"

################################################################################
# Step 4: Deploy Configuration Files
################################################################################
log_section "Step 4: Deploying Configuration Files"
bash "$SCRIPT_DIR/05-deploy-configs.sh"
log "✓ Configuration files deployed"

################################################################################
# Step 5: Setup Firewall
################################################################################
log_section "Step 5: Configuring Firewall"
bash "$SCRIPT_DIR/04-setup-firewall.sh"
log "✓ Firewall configured"

################################################################################
# Step 6: Setup Backup Scripts
################################################################################
log_section "Step 6: Setting Up Backup Scripts"
bash "$SCRIPT_DIR/backup-setup.sh"
log "✓ Backup scripts installed"

################################################################################
# Installation Complete
################################################################################
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log_section "Installation Complete! 🎉"
log "Duration: $((DURATION / 60)) minutes $((DURATION % 60)) seconds"
echo ""
log_warn "IMPORTANT: Next Steps Required!"
echo ""
echo "1. Edit environment variables:"
echo "   ${YELLOW}nano /opt/travelnest/.env${NC}"
echo ""
echo "2. Update passwords in .env (CRITICAL!):"
echo "   - DB_PASSWORD"
echo "   - REDIS_PASSWORD"
echo "   - ELASTICSEARCH_PASSWORD"
echo "   - KIBANA_SYSTEM_PASSWORD"
echo "   - All other secrets"
echo ""
echo "3. Generate strong passwords:"
echo "   ${BLUE}openssl rand -base64 32${NC}  # For DB passwords"
echo "   ${BLUE}openssl rand -hex 64${NC}     # For session secrets"
echo ""
echo "4. Start services:"
echo "   ${BLUE}cd /opt/travelnest${NC}"
echo "   ${BLUE}docker compose up -d${NC}"
echo ""
echo "5. Run post-deployment setup:"
echo "   ${BLUE}bash $SCRIPT_DIR/post-deploy.sh${NC}"
echo ""
echo "6. Setup Cloudflare Tunnel (if not done):"
echo "   See: ${BLUE}$PROJECT_ROOT/docs/CLOUDFLARE_TUNNEL.md${NC}"
echo ""
echo "7. Verify installation:"
echo "   ${BLUE}bash $SCRIPT_DIR/health-check.sh${NC}"
echo ""
log "Installation logs: /var/log/travelnest-setup.log"
echo ""
log_warn "You must LOGOUT and LOGIN again for Docker group changes to take effect!"
echo ""
