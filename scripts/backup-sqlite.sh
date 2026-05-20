#!/usr/bin/env bash
# Online backup de la base SQLite de iot-bee.
# Uso: ./backup-sqlite.sh [DB_PATH] [BACKUP_DIR] [RETENTION_DAYS]
set -euo pipefail

DB_PATH="${1:-${IOT_BEE_DB_PATH:-data/iot-bee.db}}"
BACKUP_DIR="${2:-${IOT_BEE_BACKUP_DIR:-backups}}"
RETENTION_DAYS="${3:-${IOT_BEE_BACKUP_RETENTION_DAYS:-14}}"

if [ ! -f "$DB_PATH" ]; then
    echo "error: database not found at $DB_PATH" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_NAME="iot-bee-${TIMESTAMP}.db"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "[backup] source=${DB_PATH} dest=${BACKUP_PATH}"

# .backup usa la API online de SQLite y es seguro con la app corriendo.
sqlite3 "$DB_PATH" ".backup '${BACKUP_PATH}'"

echo "[backup] integrity_check…"
INTEGRITY_RESULT="$(sqlite3 "$BACKUP_PATH" "PRAGMA integrity_check;")"
if [ "$INTEGRITY_RESULT" != "ok" ]; then
    echo "error: integrity_check on backup failed: $INTEGRITY_RESULT" >&2
    rm -f "$BACKUP_PATH"
    exit 2
fi

echo "[backup] gzipping…"
gzip "$BACKUP_PATH"
BACKUP_PATH_GZ="${BACKUP_PATH}.gz"

echo "[backup] ok -> ${BACKUP_PATH_GZ}"

echo "[backup] rotating files older than ${RETENTION_DAYS}d…"
find "$BACKUP_DIR" -name "iot-bee-*.db.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete || true

echo "[backup] done"
