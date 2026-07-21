#!/bin/sh
# docker-entrypoint.sh — Lanza iot-bee; la aplicación aplica sus migraciones PostgreSQL.
# Cuando IOTBEE_DEMO_MODE=1, también arranca el broker, emisor y receptor de
# demo dentro de este mismo contenedor. Es una modalidad temporal de Render,
# no una topología de producción.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
    echo "[iot-bee] ERROR: DATABASE_URL no está definida." >&2
    exit 1
fi

if [ "${IOTBEE_DEMO_MODE:-0}" = "1" ]; then
    echo "[iot-bee] Iniciando servicios internos de demo."

    # La plantilla del frontend usa estos nombres de host, que en este modo
    # resuelven al loopback del contenedor único.
    if ! grep -q '[[:space:]]rabbitmq\|[[:space:]]demo-sink' /etc/hosts; then
        printf '127.0.0.1 rabbitmq demo-sink\n' >> /etc/hosts
    fi

    export RABBITMQ_MNESIA_BASE=/tmp/iot-bee-rabbitmq/mnesia
    export RABBITMQ_LOG_BASE=/tmp/iot-bee-rabbitmq/log
    export RABBITMQ_PID_FILE=/tmp/iot-bee-rabbitmq/rabbitmq.pid
    export RABBITMQ_ENABLED_PLUGINS_FILE=/tmp/iot-bee-rabbitmq/enabled_plugins
    mkdir -p "$RABBITMQ_MNESIA_BASE" "$RABBITMQ_LOG_BASE" /tmp/iot-bee-demo
    printf '[rabbitmq_management].\n' > "$RABBITMQ_ENABLED_PLUGINS_FILE"
    chown -R rabbitmq:rabbitmq /tmp/iot-bee-rabbitmq
    chown -R iotbee:iotbee /tmp/iot-bee-demo

    runuser -u rabbitmq -- env HOME=/tmp/iot-bee-rabbitmq rabbitmq-server -detached

    attempt=0
    until wget -q -O /dev/null \
        --user=guest --password=guest \
        http://127.0.0.1:15672/api/overview; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 30 ]; then
            echo "[iot-bee] ERROR: RabbitMQ no quedó disponible para la demo." >&2
            exit 1
        fi
        sleep 1
    done

    runuser -u iotbee -- env DEMO_TRACE_PATH=/tmp/iot-bee-demo/events.ndjson \
        python3 /opt/iot-bee-demo/webhook_receiver.py &
    runuser -u iotbee -- python3 /opt/iot-bee-demo/telemetry_publisher.py &

    export RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/%2f
fi

exec runuser -u iotbee -- /usr/local/bin/iot-bee "$@"
