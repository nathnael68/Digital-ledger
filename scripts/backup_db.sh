#!/usr/bin/env bash
# ==============================================================================
# Delgone Digital Sales Ledger - Automated Database Backup Script
# Delgone Trading PLC - Addis Ababa, Ethiopia
# ==============================================================================
# Retention Policy:
#   - Daily backups: Retained for 7 days
#   - Weekly backups (Sundays): Retained for 30 days (4 weeks)
#   - Monthly backups (1st of month): Retained for 180 days (6 months)
# ==============================================================================

set -euo pipefail

# 1. Configuration & Defaults
PROJECT_NAME="delgone_ledger"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DAY_OF_WEEK=$(date +"%u")  # 7 = Sunday
DAY_OF_MONTH=$(date +"%d") # 01 = 1st of month

BACKUP_DIR="${BACKUP_DIR:-/var/backups/delgone_ledger}"
CONTAINER_NAME="${DB_CONTAINER_NAME:-delgone_db}"
POSTGRES_USER="${POSTGRES_USER:-delgone_user}"
POSTGRES_DB="${POSTGRES_DB:-delgone_ledger}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# Determine backup directory hierarchy
DAILY_DIR="${BACKUP_DIR}/daily"
WEEKLY_DIR="${BACKUP_DIR}/weekly"
MONTHLY_DIR="${BACKUP_DIR}/monthly"

mkdir -p "${DAILY_DIR}" "${WEEKLY_DIR}" "${MONTHLY_DIR}"

BACKUP_FILENAME="${PROJECT_NAME}_backup_${TIMESTAMP}.sql.gz"
TARGET_FILE="${DAILY_DIR}/${BACKUP_FILENAME}"

echo "[INFO] [$(date -Iseconds)] Initiating backup for database '${POSTGRES_DB}'..."

# 2. Execute pg_dump
# Check if running alongside Docker container or via local pg_dump
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
    echo "[INFO] Executing pg_dump inside Docker container '${CONTAINER_NAME}'..."
    docker exec -t "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --clean --if-exists \
        | gzip > "${TARGET_FILE}"
elif command -v pg_dump >/dev/null 2>&1; then
    echo "[INFO] Executing host pg_dump against ${POSTGRES_HOST}:${POSTGRES_PORT}..."
    PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-owner --clean --if-exists \
        | gzip > "${TARGET_FILE}"
else
    echo "[ERROR] Neither active Docker container '${CONTAINER_NAME}' nor host 'pg_dump' utility was found!" >&2
    exit 1
fi

# 3. Verify backup file creation and size
if [ ! -s "${TARGET_FILE}" ]; then
    echo "[ERROR] Backup failed: output file '${TARGET_FILE}' is empty or does not exist." >&2
    rm -f "${TARGET_FILE}"
    exit 1
fi

FILESIZE=$(stat -c%s "${TARGET_FILE}" 2>/dev/null || stat -f%z "${TARGET_FILE}" 2>/dev/null || wc -c < "${TARGET_FILE}")
echo "[INFO] Backup created successfully: ${TARGET_FILE} (${FILESIZE} bytes)"

# 4. Generate SHA256 Checksum
if command -v sha256sum >/dev/null 2>&1; then
    (cd "$(dirname "${TARGET_FILE}")" && sha256sum "$(basename "${TARGET_FILE}")" > "$(basename "${TARGET_FILE}").sha256")
    echo "[INFO] SHA256 checksum generated: ${TARGET_FILE}.sha256"
fi

# 5. Handle Weekly / Monthly Retention Archiving
if [ "${DAY_OF_WEEK}" -eq 7 ]; then
    echo "[INFO] Sunday detected - archiving copy to weekly retention tier..."
    cp "${TARGET_FILE}" "${WEEKLY_DIR}/"
    [ -f "${TARGET_FILE}.sha256" ] && cp "${TARGET_FILE}.sha256" "${WEEKLY_DIR}/"
fi

if [ "${DAY_OF_MONTH}" = "01" ]; then
    echo "[INFO] First day of month detected - archiving copy to monthly retention tier..."
    cp "${TARGET_FILE}" "${MONTHLY_DIR}/"
    [ -f "${TARGET_FILE}.sha256" ] && cp "${TARGET_FILE}.sha256" "${MONTHLY_DIR}/"
fi

# 6. Apply Retention Policy Pruning
echo "[INFO] Applying retention policies..."
# Daily: delete files older than 7 days
find "${DAILY_DIR}" -type f -name "*.sql.gz*" -mtime +7 -exec rm -f {} +
# Weekly: delete files older than 30 days
find "${WEEKLY_DIR}" -type f -name "*.sql.gz*" -mtime +30 -exec rm -f {} +
# Monthly: delete files older than 180 days
find "${MONTHLY_DIR}" -type f -name "*.sql.gz*" -mtime +180 -exec rm -f {} +

echo "[SUCCESS] [$(date -Iseconds)] Backup and retention cycle completed successfully."
exit 0
