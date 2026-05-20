#!/bin/sh
# docker-entrypoint.sh — Verifica permisos y lanza iot-bee.
# Las migraciones las ejecuta la propia aplicacion al arrancar (sqlx::migrate!)
# SQLite crea el archivo de BD automaticamente si no existe.
set -e

DB_FILE="${DATABASE_URL#sqlite://}"

if [ -z "$DB_FILE" ]; then
    echo "[iot-bee] ERROR: DATABASE_URL no está definida o no tiene ruta." >&2
    exit 1
fi

DATA_DIR="$(dirname "$DB_FILE")"

# Verificar que el directorio es escribible (necesario para crear la BD y archivos WAL)
if ! test -w "$DATA_DIR"; then
    echo "[iot-bee] ERROR: sin permisos de escritura en '$DATA_DIR'." >&2
    echo "[iot-bee] Ejecuta en el host: sudo chown -R 1001:1001 ./data" >&2
    exit 1
fi

exec /usr/local/bin/iot-bee "$@"
