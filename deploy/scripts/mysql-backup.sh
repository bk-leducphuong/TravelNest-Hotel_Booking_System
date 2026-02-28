#!/usr/bin/env bash
################################################################################
# MySQL Backup Script
################################################################################

set -e

# Configuration
BACKUP_DIR="/opt/travelnest/backups/mysql"
CONTAINER_NAME="travelnest-mysql"
RETENTION_DAYS=30

# Load environment variables
source /opt/travelnest/.env

DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/travelnest_$(date +%Y%m%d_%H%M%S).sql.gz"

# Perform backup
echo "[$(date)] Starting MySQL backup..."
docker exec "$CONTAINER_NAME" mysqldump \
  -u"$DB_USER" \
  -p"$DB_PASSWORD" \
  "$DB_NAME" \
  | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    echo "[$(date)] Backup completed: $BACKUP_FILE"
    echo "[$(date)] Backup size: $(du -h $BACKUP_FILE | cut -f1)"
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

# Remove old backups
echo "[$(date)] Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "travelnest_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup process completed successfully!"
