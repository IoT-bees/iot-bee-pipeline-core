# iot-bee REST API Reference

**Base URL:** `http://127.0.0.1:8080`  
**Content-Type:** `application/json`  
**Interactive docs (Swagger UI):** `http://127.0.0.1:8080/swagger-ui/`

---

## Table of Contents

- [Error Format](#error-format)
- [Connection Types](#connection-types)
- [Data Sources](#data-sources)
- [Data Stores](#data-stores)
- [Validation Schemas](#validation-schemas)
- [Pipeline Groups](#pipeline-groups)
- [Pipelines](#pipelines)
- [Pipeline Lifecycle](#pipeline-lifecycle)
- [Schema Reference](#schema-reference)

---

## Error Format

All error responses follow the same structure:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request / validation error |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate name) |
| `500` | Internal server error |

---

## Connection Types

### `GET /connection-types`

Returns the list of supported data-source and data-store type identifiers.

**Response `200`:**

```json
[
  { "id": 1, "name": "RABBIT_MQ" },
  { "id": 2, "name": "MQTT" },
  { "id": 3, "name": "KAFKA" }
]
```

---

## Data Sources

Data sources represent message broker connections that feed raw data into a pipeline.

### `POST /data-sources`

Create a new data source.

**Request body:**

```json
{
  "name": "my-rabbitmq-source",
  "sourceType": "RABBIT_MQ",
  "config": {
    "host": "amqp://localhost:5672",
    "queue": "sensor_data"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Unique name for the source |
| `sourceType` | string | ✅ | One of: `RABBIT_MQ`, `MQTT`, `KAFKA` |
| `config` | object | ✅ | Source-specific connection config (see [Source Config Examples](#source-config-examples)) |

**Response `201`:**

```json
{
  "id": 1,
  "name": "my-rabbitmq-source",
  "sourceType": "RABBIT_MQ",
  "config": { "host": "amqp://localhost:5672", "queue": "sensor_data" }
}
```

---

### `GET /data-sources`

List all data sources.

**Response `200`:** array of data source objects (same shape as the create response).

---

### `GET /data-sources/{id}`

Get a single data source by numeric ID.

**Response `200`:** data source object.  
**Response `404`:** `{ "error": "Data source not found" }`

---

### `PUT /data-sources/{id}`

Full update of a data source (replaces all mutable fields).

**Request body:** same shape as `POST /data-sources`.

**Response `200`:** updated data source object.

---

### `PUT /data-sources/{id}/name`

Rename a data source.

**Request body:**

```json
{ "name": "new-source-name" }
```

**Response `200`:** updated data source object.

---

### `DELETE /data-sources/{id}`

Delete a data source.

**Response `200`:** `{ "message": "Data source deleted" }`  
**Response `404`:** source not found.

---

## Data Stores

Data stores represent the external persistence layer where processed pipeline data is written.

### `POST /data-stores`

Create a new data store.

**Request body:**

```json
{
  "name": "my-influx-store",
  "persistenceType": "INFLUX_DB",
  "host": "http://localhost:8086",
  "database": "sensors",
  "measurement": "temperature",
  "tag_fields": ["location", "device_id"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Unique name for the store |
| `persistenceType` | string | ✅ | `INFLUX_DB` or `LOCAL_LOG` |
| `host` | string | InfluxDB | InfluxDB server URL |
| `database` | string | InfluxDB | InfluxDB database name |
| `measurement` | string | InfluxDB | InfluxDB measurement name |
| `tag_fields` | string[] | ❌ | Fields to write as InfluxDB tags (must be `string` type in schema) |
| `log_name` | string | LOCAL_LOG | Log file identifier |

**Response `201`:** created data store object.

---

### `GET /data-stores`

List all data stores.

---

### `GET /data-stores/{id}`

Get a single data store by ID.

---

### `PUT /data-stores/{id}`

Full update of a data store.

---

### `DELETE /data-stores/{id}`

Delete a data store.

**Response `200`:** `{ "message": "Data store deleted" }`

---

## Validation Schemas

A validation schema defines the set of fields that a pipeline expects, along with their types, constraints, default values, and optional arithmetic transformations. Data that does not match the schema is rejected.

### `POST /validation-schemas`

Create a validation schema.

**Request body:**

```json
{
  "name": "temperature-schema",
  "schema": {
    "fields": [
      {
        "name": "temperature",
        "field_type": "float",
        "required": true,
        "min": -50.0,
        "max": 150.0
      },
      {
        "name": "humidity",
        "field_type": "float",
        "required": false,
        "default": 0.0,
        "min": 0.0,
        "max": 100.0
      },
      {
        "name": "location",
        "field_type": "string",
        "required": true
      }
    ]
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Unique schema name |
| `schema` | object | ✅ | Schema definition object |
| `schema.fields` | array | ✅ | Array of field definitions |

**Schema field properties:**

| Property | Type | Description |
|---|---|---|
| `name` | string | Field name (matches JSON message key) |
| `field_type` | string | `float`, `int`, `bool`, or `string` |
| `required` | bool | Whether the field must be present in the message |
| `default` | number/bool/string | Value to use when field is absent (only if `required: false`) |
| `min` | number | Minimum allowed value (numeric types only) |
| `max` | number | Maximum allowed value (numeric types only) |
| `operations` | array | List of arithmetic operations to apply to the value |

**Operations example** (converts Celsius to Fahrenheit):

```json
{
  "name": "temperature",
  "field_type": "float",
  "required": true,
  "operations": [
    { "operator": "Multiply", "operand": 1.8 },
    { "operator": "Add",      "operand": 32.0 }
  ]
}
```

Supported operators: `Add`, `Subtract`, `Multiply`, `Divide`.

**Response `201`:** created schema object (id, name, schema).

---

### `GET /validation-schemas`

List all validation schemas.

---

### `GET /validation-schemas/{id}`

Get a single validation schema by ID.

---

### `PUT /validation-schemas/{id}`

Full update of a validation schema.

---

### `PUT /validation-schemas/{id}/name`

Rename a validation schema.

**Request body:** `{ "name": "new-schema-name" }`

---

### `DELETE /validation-schemas/{id}`

Delete a validation schema.

---

## Pipeline Groups

Groups are optional logical containers for organising pipelines.

### `POST /pipeline-groups`

**Request body:**

```json
{ "name": "building-a-sensors" }
```

**Response `201`:**

```json
{ "id": 1, "name": "building-a-sensors" }
```

---

### `GET /pipeline-groups`

List all groups.

---

### `GET /pipeline-groups/{id}`

Get a group by ID.

---

### `DELETE /pipeline-groups/{id}`

Delete a group.

---

## Pipelines

Pipelines wire together a data source, a validation schema, and a data store.

### `POST /pipelines`

Create a new pipeline.

**Request body:**

```json
{
  "name": "temperature-pipeline",
  "replication": 2,
  "data_source_id": 1,
  "data_store_id": 1,
  "validation_schema_id": 1,
  "group_id": 1
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Unique pipeline name |
| `replication` | integer | ✅ | Number of concurrent replicas (workers) |
| `data_source_id` | integer | ❌ | Foreign key to a data source |
| `data_store_id` | integer | ❌ | Foreign key to a data store |
| `validation_schema_id` | integer | ❌ | Foreign key to a validation schema |
| `group_id` | integer | ❌ | Foreign key to a pipeline group |

**Response `201`:** created pipeline object including all IDs and `status`.

---

### `GET /pipelines`

List all pipelines.

---

### `GET /pipelines/{id}`

Get a pipeline by ID.

---

### `DELETE /pipelines/{id}`

Delete a pipeline (stops it first if running).

---

### `GET /pipelines/group/{group_id}`

List all pipelines belonging to a group.

---

### `PUT /pipelines/data_source`

Assign (or reassign) a data source to a pipeline.

**Request body:**

```json
{
  "pipeline_id": 1,
  "data_source_id": 2
}
```

---

### `PUT /pipelines/data_store`

Assign a data store to a pipeline.

**Request body:**

```json
{
  "pipeline_id": 1,
  "data_store_id": 2
}
```

---

### `PUT /pipelines/validation_schema`

Assign a validation schema to a pipeline.

**Request body:**

```json
{
  "pipeline_id": 1,
  "validation_schema_id": 2
}
```

---

### `PUT /pipelines/group`

Assign a pipeline to a group.

**Request body:**

```json
{
  "pipeline_id": 1,
  "group_id": 2
}
```

---

## Pipeline Lifecycle

Manages the runtime state of pipelines within the actor system.

### `POST /pipeline-lifecycle/start/{pipeline_id}`

Start a pipeline. Spawns the actor hierarchy and begins consuming from the data source.

**Response `200`:**

```json
{
  "pipeline_id": 1,
  "pipeline_name": "temperature-pipeline",
  "status": "Running",
  "replicas": 2
}
```

**Response `400`:** Pipeline is already running, or missing required relations (data source, data store, schema).

---

### `POST /pipeline-lifecycle/stop/{pipeline_id}`

Stop a running pipeline gracefully.

**Response `200`:**

```json
{
  "pipeline_id": 1,
  "pipeline_name": "temperature-pipeline",
  "status": "Stopped"
}
```

---

### `GET /pipeline-lifecycle/status/{pipeline_id}`

Get the runtime status of a single pipeline.

**Response `200`:**

```json
{
  "pipeline_id": 1,
  "pipeline_name": "temperature-pipeline",
  "status": "Running",
  "replicas": 2
}
```

**Pipeline status values:**

| Value | Meaning |
|---|---|
| `Running` | Actor hierarchy is active and processing messages |
| `Stopped` | Pipeline is not running |
| `Error` | Pipeline encountered a fatal error |

---

### `GET /pipeline-lifecycle/status`

Get the runtime status of all known pipelines.

**Response `200`:** array of status objects (same shape as single status).

---

## Schema Reference

### Source Config Examples

#### RabbitMQ

```json
{
  "sourceType": "RABBIT_MQ",
  "config": {
    "host": "amqp://user:password@localhost:5672",
    "queue": "sensor_data"
  }
}
```

#### MQTT

```json
{
  "sourceType": "MQTT",
  "config": {
    "host": "mqtt://localhost:1883",
    "topic": "sensors/temperature"
  }
}
```

#### Kafka

```json
{
  "sourceType": "KAFKA",
  "config": {
    "brokers": "localhost:9092",
    "topic": "sensor_data",
    "group_id": "iot-bee-consumer"
  }
}
```

---

### Data Store Config Examples

#### InfluxDB

```json
{
  "persistenceType": "INFLUX_DB",
  "host": "http://localhost:8086",
  "database": "sensors",
  "measurement": "temperature",
  "tag_fields": ["location", "device_id"]
}
```

String fields listed in `tag_fields` are written as InfluxDB **tags**. All other fields are written as InfluxDB **fields**. String fields not in `tag_fields` are written as text fields.

#### Local Log

```json
{
  "persistenceType": "LOCAL_LOG",
  "log_name": "temperature-log"
}
```

Data is appended as newline-delimited JSON to a file under the configured log directory.

---

### Field Validation

When a pipeline processes a message, each field is validated against the schema:

1. **Required check** — if `required: true` and the field is missing → message rejected.
2. **Default injection** — if `required: false` and field is absent → `default` value is used.
3. **Type coercion** — `bool` values are converted to `1.0`/`0.0` for numeric fields.
4. **Range check** — if `min`/`max` are set and value is out of range → message rejected.
5. **Operations** — arithmetic operations are applied in sequence to the final numeric value.
6. **String pass-through** — `string` fields bypass numeric validation entirely and are passed as-is.

Rejected messages are logged and dropped; they do not stop the pipeline.
