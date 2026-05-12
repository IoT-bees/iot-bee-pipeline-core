#!/bin/sh
# docker-entrypoint.sh — Seeds the SQLite database on first run, then launches iot-bee.
set -e

# Derive the filesystem path from DATABASE_URL.
# Supports:
#   sqlite:///data/iot-bee.db  (absolute path → /data/iot-bee.db)
#   sqlite://data/iot-bee.db   (relative path → data/iot-bee.db)
DB_FILE="${DATABASE_URL#sqlite://}"

if [ -z "$DB_FILE" ]; then
    echo "[iot-bee] ERROR: DATABASE_URL is not set or has no path component." >&2
    exit 1
fi

if [ ! -f "$DB_FILE" ]; then
    echo "[iot-bee] Database not found at '$DB_FILE'. Seeding from template..."
    # Ensure the parent directory exists (e.g. when using a bind mount)
    mkdir -p "$(dirname "$DB_FILE")"
    cp /iot-bee.db.template "$DB_FILE"
    echo "[iot-bee] Database initialised."
else
    echo "[iot-bee] Database found at '$DB_FILE'. Skipping seed."
fi

exec /usr/local/bin/iot-bee "$@"
