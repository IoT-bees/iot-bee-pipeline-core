# Data Sources

A data source defines how the platform connects to an external IoT broker (RabbitMQ, MQTT, Kafka) to consume messages. Each data source stores connection details and a state flag. It is referenced by a pipeline to determine where to read data from.

> Use [`GET /connection-types`](../connection_types/README.md) to retrieve the list of supported `sourceType` values.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/data-sources` | Create a new data source |
| `GET` | `/data-sources` | List all data sources |
| `GET` | `/data-sources/{id}` | Get a data source by ID |
| `PUT` | `/data-sources/{id}` | Update configuration, state or description |
| `PUT` | `/data-sources/{id}/name` | Update name only |
| `DELETE` | `/data-sources/{id}` | Delete a data source |

---

## Models

### `CreateDataSourceRequest` (POST body)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | `string` | 1–30 chars | Unique human-readable name |
| `dataSourceState` | `string` | `Active` \| `Inactive` \| `Error` | Operational state |
| `dataSourceConfiguration` | object | required | Protocol config object (see below) |
| `dataSourceDescription` | `string` | 1–255 chars | Free-text description |

#### `dataSourceConfiguration` — discriminant field: `sourceType`

**RABBITMQ**

```json
{
  "sourceType": "RABBITMQ",
  "url": "amqp://user:pass@localhost:5672",
  "queue_name": "iot_queue",
  "consumer_name": "iot_consumer"
}
```

**MQTT**

```json
{
  "sourceType": "MQTT",
  "broker_url": "mqtt://localhost:1883",
  "topic": "sensors/temperature",
  "client_id": "iot_client_01"
}
```

**KAFKA**

```json
{
  "sourceType": "KAFKA",
  "brokers": ["localhost:9092"],
  "topic": "iot_events",
  "group_id": "iot_group"
}
```

---

### `DataSourceResponse` (GET body)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `u32` | Unique identifier |
| `name` | `string` | Human-readable name |
| `dataSourceState` | `string` | Current state (`Active`, `Inactive`, `Error`) |
| `dataSourceConfiguration` | `string` | Serialized JSON of the connection config |
| `sourceType` | `string` | Protocol: `RABBITMQ`, `MQTT`, `KAFKA` |
| `dataSourceDescription` | `string` | Description |
| `createdAt` | `string` (ISO 8601) | Creation timestamp |
| `updatedAt` | `string` (ISO 8601) | Last update timestamp |

---

### `UpdateDataSourceRequest` (PUT `/{id}` body)

All fields optional. Only provided fields are updated.

| Field | Type | Description |
|-------|------|-------------|
| `dataSourceState` | `string?` | New state |
| `dataSourceConfiguration` | object? | New connection config |
| `dataSourceDescription` | `string?` | New description |

---

### `UpdateDataSourceNameRequest` (PUT `/{id}/name` body)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | `string` | 1–30 chars | New unique name |

---

## Error Codes

| Status | When |
|--------|------|
| `201 Created` | Data source created |
| `204 No Content` | Data source deleted |
| `400 Bad Request` | Validation failed (missing fields, invalid type, name too long, etc.) |
| `404 Not Found` | No data source with that ID |
| `409 Conflict` | Name already in use by another data source |
| `500 Internal Server Error` | Database error |

All errors return `{ "error": "..." }`.

---

## cURL Examples

```bash
# Create a RabbitMQ data source
curl -X POST http://127.0.0.1:8080/data-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rabbitmq-prod",
    "dataSourceState": "Active",
    "dataSourceConfiguration": {
      "sourceType": "RABBITMQ",
      "url": "amqp://guest:guest@localhost:5672",
      "queue_name": "sensors",
      "consumer_name": "iot-consumer"
    },
    "dataSourceDescription": "Production RabbitMQ broker"
  }'

# List all data sources
curl http://127.0.0.1:8080/data-sources

# Get a specific data source
curl http://127.0.0.1:8080/data-sources/1

# Update name only
curl -X PUT http://127.0.0.1:8080/data-sources/1/name \
  -H "Content-Type: application/json" \
  -d '{ "name": "rabbitmq-prod-v2" }'

# Update configuration
curl -X PUT http://127.0.0.1:8080/data-sources/1 \
  -H "Content-Type: application/json" \
  -d '{
    "dataSourceState": "Inactive",
    "dataSourceDescription": "Temporarily disabled"
  }'

# Delete
curl -X DELETE http://127.0.0.1:8080/data-sources/1
```

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
