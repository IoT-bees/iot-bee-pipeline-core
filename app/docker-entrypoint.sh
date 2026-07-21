#!/bin/sh
# docker-entrypoint.sh — Lanza iot-bee; la aplicación aplica sus migraciones PostgreSQL.
set -e

if [ -z "${DATABASE_URL:-}" ]; then
    echo "[iot-bee] ERROR: DATABASE_URL no está definida." >&2
    exit 1
fi

exec /usr/local/bin/iot-bee "$@"
