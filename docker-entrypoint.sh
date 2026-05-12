#!/bin/sh
# docker-entrypoint.sh — Siembra la DB si no existe y lanza iot-bee.
# El proceso ya corre como iotbee (UID 1001) gracias a USER en el Dockerfile.
set -e

# Derivar la ruta del fichero de BD desde DATABASE_URL.
# Soporta:
#   sqlite:///data/pipeline.db  (ruta absoluta → /data/pipeline.db)
#   sqlite://data/pipeline.db   (ruta relativa → data/pipeline.db)
DB_FILE="${DATABASE_URL#sqlite://}"

if [ -z "$DB_FILE" ]; then
    echo "[iot-bee] ERROR: DATABASE_URL no está definida o no tiene ruta." >&2
    exit 1
fi

DATA_DIR="$(dirname "$DB_FILE")"

if [ ! -f "$DB_FILE" ]; then
    echo "[iot-bee] Base de datos no encontrada en '$DB_FILE'. Inicializando desde plantilla..."
    if ! test -w "$DATA_DIR"; then
        echo "[iot-bee] ERROR: sin permisos de escritura en '$DATA_DIR'." >&2
        echo "[iot-bee] Ejecuta en el host: sudo chown -R 1001:1001 ./data" >&2
        exit 1
    fi
    cp /iot-bee.db.template "$DB_FILE"
    echo "[iot-bee] Base de datos inicializada."
else
    echo "[iot-bee] Base de datos encontrada en '$DB_FILE'."
    if ! test -r "$DB_FILE" || ! test -w "$DB_FILE"; then
        echo "[iot-bee] ERROR: sin permisos de lectura/escritura en '$DB_FILE'." >&2
        echo "[iot-bee] Ejecuta en el host: sudo chown -R 1001:1001 ./data" >&2
        exit 1
    fi
fi

exec /usr/local/bin/iot-bee "$@"
