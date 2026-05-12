#!/bin/sh
# docker-entrypoint.sh — Arranca como root, corrige permisos de /data,
# siembra la DB si no existe y luego cede la ejecución al usuario iotbee.
set -e

# --- 1. Corregir permisos del volumen/bind-mount ---
# Esto garantiza que el contenedor funcione tanto con volúmenes nombrados
# como con bind mounts del host, sin requerir que el usuario del host
# haga chown manualmente.
chown -R iotbee:iotbee /data

# --- 2. Derivar la ruta del fichero de BD desde DATABASE_URL ---
# Soporta:
#   sqlite:///data/pipeline.db  (ruta absoluta → /data/pipeline.db)
#   sqlite://data/pipeline.db   (ruta relativa → data/pipeline.db)
DB_FILE="${DATABASE_URL#sqlite://}"

if [ -z "$DB_FILE" ]; then
    echo "[iot-bee] ERROR: DATABASE_URL no está definida o no tiene ruta." >&2
    exit 1
fi

# --- 3. Sembrar la BD si no existe ---
if [ ! -f "$DB_FILE" ]; then
    echo "[iot-bee] Base de datos no encontrada en '$DB_FILE'. Inicializando desde plantilla..."
    mkdir -p "$(dirname "$DB_FILE")"
    cp /iot-bee.db.template "$DB_FILE"
    chown iotbee:iotbee "$DB_FILE"
    echo "[iot-bee] Base de datos inicializada."
else
    echo "[iot-bee] Base de datos encontrada en '$DB_FILE'."
fi

# --- 4. Ceder ejecución al usuario no-root iotbee ---
exec gosu iotbee /usr/local/bin/iot-bee "$@"
