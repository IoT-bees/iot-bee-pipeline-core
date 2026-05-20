# Data Stores

A data store defines the destination where validated pipeline data is persisted (e.g., a time-series database, SQL database, or cloud storage). It holds connection/configuration details as a free JSON string and a reference to a store-type ID that identifies the implementation.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/data-stores` | Create a new data store |
| `GET` | `/data-stores` | List all data stores |
| `GET` | `/data-stores/{id}` | Get a data store by ID |

---

## Models

### `CreateDataStoreRequest` (POST body)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | `string` | 1–30 chars | Unique human-readable name |
| `dataStoreTypeId` | `u32` | ≥ 1 | ID of the data store type (implementation selector) |
| `dataStoreConfiguration` | `string` | min 1 char | JSON-encoded connection configuration |
| `dataStoreDescription` | `string` | 1–255 chars | Free-text description |

> `dataStoreConfiguration` is stored as an opaque string. Its content depends on the type implementation registered under `dataStoreTypeId`.

---

### `DataStoreResponse` (GET body)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `u32` | Unique identifier |
| `name` | `string` | Human-readable name |
| `dataStoreTypeId` | `u32` | Type identifier |
| `dataStoreConfiguration` | `string` | Serialized connection config |
| `dataStoreJsonSchema` | `string` | JSON schema describing the store's configuration format |
| `createdAt` | `string` (ISO 8601) | Creation timestamp |
| `updatedAt` | `string` (ISO 8601) | Last update timestamp |

---

## Error Codes

| Status | When |
|--------|------|
| `201 Created` | Data store created successfully |
| `200 OK` | Data store or list retrieved |
| `400 Bad Request` | Validation failed (missing fields, name too long, etc.) |
| `404 Not Found` | No data store with the given ID |
| `500 Internal Server Error` | Database error |

All errors return `{ "error": "..." }`.

---

## cURL Examples

```bash
# Create a data store
curl -X POST http://127.0.0.1:8080/data-stores \
  -H "Content-Type: application/json" \
  -d '{
    "name": "influxdb-prod",
    "dataStoreTypeId": 1,
    "dataStoreConfiguration": "{\"url\":\"http://localhost:8086\",\"token\":\"my-token\",\"org\":\"iot\",\"bucket\":\"sensors\"}",
    "dataStoreDescription": "Production InfluxDB instance"
  }'

# List all data stores
curl http://127.0.0.1:8080/data-stores

# Get by ID
curl http://127.0.0.1:8080/data-stores/1
```
