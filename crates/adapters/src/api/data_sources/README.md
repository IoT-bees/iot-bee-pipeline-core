# Data Sources API

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/data-sources` | Create a new data source |
| `GET` | `/data-sources` | List all data sources |
| `GET` | `/data-sources/{id}` | Get a data source by ID |
| `PUT` | `/data-sources/{id}` | Update a data source |
| `PUT` | `/data-sources/{id}/name` | Update data source name |

---

## POST /data-sources

El campo `dataSourceConfiguration` es un objeto JSON con la clave `sourceType` como discriminante.
Los tipos soportados son: `RABBIT_MQ`, `MQTT`, `KAFKA`.

### RabbitMQ

```json
{
  "name": "sensor-rabbitmq",
  "dataSourceTypeId": 1,
  "dataSourceState": "ACTIVE",
  "dataSourceConfiguration": {
    "sourceType": "RABBIT_MQ",
    "url": "amqp://guest:guest@localhost:5672",
    "queue_name": "sensor-data",
    "consumer_name": "iot-bee-consumer"
  },
  "dataSourceDescription": "RabbitMQ source for sensor telemetry"
}
```

### MQTT

> ⚠️ No implementado aún — se acepta y persiste, pero el pipeline retornará error al intentar usarlo.

```json
{
  "name": "sensor-mqtt",
  "dataSourceTypeId": 2,
  "dataSourceState": "ACTIVE",
  "dataSourceConfiguration": {
    "sourceType": "MQTT",
    "broker_url": "mqtt://localhost:1883",
    "topic": "sensors/temperature",
    "client_id": "iot-bee-client"
  },
  "dataSourceDescription": "MQTT source for temperature sensors"
}
```

### Kafka

> ⚠️ No implementado aún — se acepta y persiste, pero el pipeline retornará error al intentar usarlo.

```json
{
  "name": "sensor-kafka",
  "dataSourceTypeId": 3,
  "dataSourceState": "ACTIVE",
  "dataSourceConfiguration": {
    "sourceType": "KAFKA",
    "brokers": ["localhost:9092", "localhost:9093"],
    "topic": "sensor-events",
    "group_id": "iot-bee-group"
  },
  "dataSourceDescription": "Kafka source for sensor events"
}
```

---

## Respuesta GET /data-sources/{id}

```json
{
  "id": 1,
  "name": "sensor-rabbitmq",
  "dataSourceTypeId": 1,
  "dataSourceState": "ACTIVE",
  "sourceType": "RABBIT_MQ",
  "dataSourceConfiguration": "{\"sourceType\":\"RABBIT_MQ\",\"url\":\"amqp://...\",\"queue_name\":\"sensor-data\",\"consumer_name\":\"iot-bee-consumer\"}",
  "dataSourceDescription": "RabbitMQ source for sensor telemetry",
  "createdAt": "2026-05-06T15:00:00Z",
  "updatedAt": "2026-05-06T15:00:00Z"
}
```

---

## Errores comunes

| Status | Causa |
|--------|-------|
| `400` | `sourceType` desconocido o campos requeridos del config faltantes |
| `409` | Ya existe un data source con ese `name` |
| `404` | ID no encontrado |
