#!/usr/bin/env bash
# ==============================================================================
# Delgone Digital Sales Ledger - Automated Database Restoration Script
# Delgone Trading PLC - Addis Ababa, Ethiopia
# ==============================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"
FORCE_MODE="${2:-}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <path_to_backup.sql.gz> [--force]"
    echo "Example: $0 /var/backups/delgone_ledger/daily/delgone_ledger_backup_20261118_120000.sql.gz"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[ERROR] Specified backup file '${BACKUP_FILE}' does not exist!" >&2
    exit 1
fi

CONTAINER_NAME="${DB_CONTAINER_NAME:-delgone_db}"
POSTGRES_USER="${POSTGRES_USER:-delgone_user}"
POSTGRES_DB="${POSTGRES_DB:-delgone_ledger}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "[INFO] Target database: ${POSTGRES_DB}"
echo "[INFO] Source backup:   ${BACKUP_FILE}"

# 1. Verify Checksum if present
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ] && command -v sha256sum >/dev/null 2>&1; then
    echo "[INFO] Verifying SHA256 integrity..."
    (cd "$(dirname "${BACKUP_FILE}")" && sha256sum -c "$(basename "${CHECKSUM_FILE}")")
    echo "[INFO] Checksum verified successfully."
else
    echo "[WARN] No checksum file found or sha256sum unavailable. Proceeding with caution."
fi

# 2. Confirmation prompt unless --force is specified
if [ "${FORCE_MODE}" != "--force" ] && [ "${FORCE_MODE}" != "-y" ]; then
    echo ""
    echo "=============================================================================="
    echo "  WARNING: RESTORATION WILL OVERWRITE CURRENT DATA IN '${POSTGRES_DB}'"
    echo "=============================================================================="
    read -r -p "Are you sure you want to proceed with database restoration? (yes/no): " CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        echo "[ABORTED] Restoration cancelled by user."
        exit 0
    fi
fi

echo "[INFO] Terminating active connections to '${POSTGRES_DB}'..."
TERMINATE_SQL="SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
    docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d postgres -c "${TERMINATE_SQL}" >/dev/null 2>&1 || true
    echo "[INFO] Restoring data into container '${CONTAINER_NAME}'..."
    gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
    
    echo "[INFO] Verifying restoration..."
    TABLE_COUNT=$(docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
    echo "[SUCCESS] Restoration complete. Total public tables in '${POSTGRES_DB}': $(echo ${TABLE_COUNT} | tr -d ' ')"
elif command -v psql >/dev/null 2>&1; then
    PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c "${TERMINATE_SQL}" >/dev/null 2>&1 || true
    echo "[INFO] Restoring data into ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}..."
    gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
    
    echo "[INFO] Verifying restoration..."
    TABLE_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
    echo "[SUCCESS] Restoration complete. Total public tables in '${POSTGRES_DB}': $(echo ${TABLE_COUNT} | tr -d ' ')"
else
    echo "[ERROR] Neither active Docker container '${CONTAINER_NAME}' nor host 'psql' utility was found!" >&2
    exit 1
fi

echo "[SUCCESS] Database restoration successfully completed and verified."
exit 0
