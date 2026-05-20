#!/usr/bin/env bash
# Restaurar la base SQLite de iot-bee desde un backup .db.gz.
# Uso: ./restore-sqlite.sh BACKUP_FILE.db.gz [DB_PATH]
set -euo pipefail

BACKUP_FILE="${1:?usage: restore-sqlite.sh BACKUP_FILE.db.gz [DB_PATH]}"
DB_PATH="${2:-${IOT_BEE_DB_PATH:-data/iot-bee.db}}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "error: backup file not found: $BACKUP_FILE" >&2
    exit 1
fi

TMPDIR_RESTORE="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_RESTORE"' EXIT

TMP_DB="${TMPDIR_RESTORE}/iot-bee.db"

echo "[restore] gunzipping ${BACKUP_FILE}…"
gunzip -c "$BACKUP_FILE" > "$TMP_DB"

echo "[restore] integrity_check…"
INTEGRITY_RESULT="$(sqlite3 "$TMP_DB" "PRAGMA integrity_check;")"
if [ "$INTEGRITY_RESULT" != "ok" ]; then
    echo "error: integrity_check on backup failed: $INTEGRITY_RESULT" >&2
    exit 2
fi

if [ -f "$DB_PATH" ]; then
    TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
    SIDE_COPY="${DB_PATH}.before-restore-${TIMESTAMP}"
    echo "[restore] preserving current db -> ${SIDE_COPY}"
    cp "$DB_PATH" "$SIDE_COPY"
fi

mkdir -p "$(dirname "$DB_PATH")"
mv "$TMP_DB" "$DB_PATH"

echo "[restore] ok -> ${DB_PATH}"
echo "[restore] remember to restart iot-bee so it reopens the file."
