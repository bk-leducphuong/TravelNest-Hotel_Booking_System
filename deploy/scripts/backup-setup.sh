#!/usr/bin/env bash
################################################################################
# Setup Automated Backup Scripts
################################################################################

set -e

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

TARGET_DIR="/opt/travelnest"
REAL_USER="${REAL_USER:-$SUDO_USER}"

log "Setting up automated backups..."

# Make backup script executable
chmod +x "$TARGET_DIR/scripts/mysql-backup.sh"

log "Configuring cron job for daily MySQL backups..."

# Add cron job for daily backups at 2 AM
CRON_JOB="0 2 * * * $TARGET_DIR/scripts/mysql-backup.sh >> $TARGET_DIR/logs/backup.log 2>&1"

# Check if cron job already exists
if crontab -u "$REAL_USER" -l 2>/dev/null | grep -q "mysql-backup.sh"; then
    log "Cron job already exists"
else
    # Add cron job
    (crontab -u "$REAL_USER" -l 2>/dev/null; echo "$CRON_JOB") | crontab -u "$REAL_USER" -
    log "✓ Cron job added for user $REAL_USER"
fi

# Show current crontab
log "Current cron jobs for $REAL_USER:"
crontab -u "$REAL_USER" -l 2>/dev/null || echo "No cron jobs"

log "✓ Backup automation configured"
log "Backups will run daily at 2:00 AM"
log "Backup location: $TARGET_DIR/backups/mysql/"
log "Backup logs: $TARGET_DIR/logs/backup.log"
