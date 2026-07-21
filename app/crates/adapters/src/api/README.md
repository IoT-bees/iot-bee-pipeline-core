# IoT Bee REST API

REST API for **IoT Bee** — a platform designed to ingest data from IoT message brokers, validate and transform it through configurable pipelines, and persist the results to configurable data stores.

- **Base URL:** `http://127.0.0.1:8080`
- **Swagger UI:** [`http://127.0.0.1:8080/swagger-ui/`](http://127.0.0.1:8080/swagger-ui/)
- **OpenAPI JSON:** [`http://127.0.0.1:8080/api-docs/openapi.json`](http://127.0.0.1:8080/api-docs/openapi.json)

---

## Architecture

IoT Bee follows a **hexagonal (Clean) architecture** with three main layers:

```
API (adapters)
    ↓
Application (use cases)
    ↓
Domain (entities, value objects, ports)
    ↑
Infrastructure (repositories, actor system, brokers, databases)
```

The API layer is built with **[Actix-web](https://actix.rs/)** and documented via **[utoipa](https://github.com/juhaku/utoipa)** (OpenAPI 3.0 / Swagger). Pipelines run as **[Actix actor](https://actix.rs/docs/actix/)** systems for concurrent, fault-tolerant message processing.

---

## Conventions

| Convention | Value |
|------------|-------|
| Content-Type | `application/json` |
| ID type | `u32` (unsigned 32-bit integer) |
| Timestamps | ISO 8601 / RFC 3339 (UTC) |
| Error body | `{ "error": "human-readable message" }` |
| Validation | Performed before persistence; returns `400` with a descriptive message |

---

## Error Response Schema

All endpoints that can fail return:

```json
{ "error": "descriptive error message" }
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200 OK` | Successful retrieval or update |
| `201 Created` | Resource created |
| `204 No Content` | Resource deleted |
| `400 Bad Request` | Validation failed or operation not allowed |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Duplicate name or resource in use |
| `500 Internal Server Error` | Unexpected database or internal error |

---

## Modules

| Module | Path prefix | README |
|--------|-------------|--------|
| Connection Types | `/connection-types` | [connection_types/README.md](connection_types/README.md) |
| Data Sources | `/data-sources` | [data_sources/README.md](data_sources/README.md) |
| Data Stores | `/data-stores` | [data_store/README.md](data_store/README.md) |
| Pipeline Groups | `/pipeline-groups` | [pipeline_groups/README.md](pipeline_groups/README.md) |
| Pipelines | `/pipelines` | [pipeline_data/README.md](pipeline_data/README.md) |
| Validation Schemas | `/validation-schemas` | [validation_schemas/README.md](validation_schemas/README.md) |
| Pipeline Lifecycle | `/pipeline-lifecycle` | [pipeline_lifecycle/README.md](pipeline_lifecycle/README.md) |

---

## Complete Endpoint Reference

### Connection Types

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/connection-types` | List all supported data source protocols |

### Data Sources

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/data-sources` | Create a new data source |
| `GET` | `/data-sources` | List all data sources |
| `GET` | `/data-sources/{id}` | Get a data source by ID |
| `PUT` | `/data-sources/{id}` | Update configuration, state or description |
| `PUT` | `/data-sources/{id}/name` | Update name only |
| `DELETE` | `/data-sources/{id}` | Delete a data source |

### Data Stores

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/data-stores` | Create a new data store |
| `GET` | `/data-stores` | List all data stores |
| `GET` | `/data-stores/{id}` | Get a data store by ID |

### Pipeline Groups

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pipeline-groups` | Create a new group |
| `GET` | `/pipeline-groups` | List all groups |
| `GET` | `/pipeline-groups/{id}` | Get a group by ID |
| `DELETE` | `/pipeline-groups/{id}` | Delete a group |

### Pipelines

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pipelines` | Create a new pipeline |
| `GET` | `/pipelines` | List all pipelines |
| `GET` | `/pipelines/{id}` | Get a pipeline by ID |
| `DELETE` | `/pipelines/{id}` | Delete a pipeline |
| `GET` | `/pipelines/group/{group_id}` | List pipelines in a group |
| `PUT` | `/pipelines/data_source/{pipeline_id}/{data_source_id}` | Reassign data source |
| `PUT` | `/pipelines/store/{pipeline_id}/{data_store_id}` | Reassign data store |
| `PUT` | `/pipelines/validation_schema/{pipeline_id}/{schema_id}` | Reassign validation schema |
| `PUT` | `/pipelines/group/{pipeline_id}/{group_id}` | Move to a different group |

### Validation Schemas

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/validation-schemas` | Create a new validation schema |
| `GET` | `/validation-schemas` | List all schemas |
| `GET` | `/validation-schemas/{id}` | Get a schema by ID |
| `PUT` | `/validation-schemas/{id}/name` | Update schema name |
| `PUT` | `/validation-schemas/{id}/schema` | Replace schema fields |
| `DELETE` | `/validation-schemas/{id}` | Delete a schema |

### Pipeline Lifecycle

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pipeline-lifecycle/start/{pipeline_id}` | Start a pipeline |
| `POST` | `/pipeline-lifecycle/stop/{pipeline_id}` | Stop a running pipeline |
| `GET` | `/pipeline-lifecycle/status/{pipeline_id}` | Query replica health |

---

## Resource Dependency Graph

The following diagram shows which resources reference others. Create them in dependency order (top to bottom):

```
Connection Types  (static — no creation needed)
      │
      ▼
 Data Sources  ──────────────────────────────────┐
                                                  │
 Data Stores                                      │
      │                                           │
      ▼                                           │
 Validation Schemas                               │
      │                                           │
      ▼                                           │
 Pipeline Groups                                  │
      │                                           │
      ▼                                           ▼
 Pipelines  (references: DataStore, DataSource, Schema, Group)
      │
      ▼
 Pipeline Lifecycle  (start / stop / status)
```

**Recommended creation order:**
1. Data Sources
2. Data Stores
3. Validation Schemas
4. Pipeline Groups
5. Pipelines
6. Start via Pipeline Lifecycle

---

## Quick Start (cURL)

```bash
BASE=http://127.0.0.1:8080

# 1. Create a data source (MQTT)
curl -X POST $BASE/data-sources \
  -H "Content-Type: application/json" \
  -d '{"name":"mqtt-sensor","dataSourceState":"Active","dataSourceConfiguration":{"sourceType":"MQTT","broker_url":"mqtt://localhost:1883","topic":"sensors/temp","client_id":"iot-01"},"dataSourceDescription":"Temperature sensor"}'

# 2. Create a data store
curl -X POST $BASE/data-stores \
  -H "Content-Type: application/json" \
  -d '{"name":"influx-prod","dataStoreTypeId":1,"dataStoreConfiguration":"{\"url\":\"http://localhost:8086\"}","dataStoreDescription":"InfluxDB"}'

# 3. Create a validation schema
curl -X POST $BASE/validation-schemas \
  -H "Content-Type: application/json" \
  -d '{"name":"temp-schema","schema":{"temperature":{"type":"float","required":true,"default":null,"validation":{"min":-40.0,"max":125.0},"operation":null}}}'

# 4. Create a group
curl -X POST $BASE/pipeline-groups \
  -H "Content-Type: application/json" \
  -d '{"name":"floor-a","description":"Factory floor A"}'

# 5. Create a pipeline
curl -X POST $BASE/pipelines \
  -H "Content-Type: application/json" \
  -d '{"name":"temp-pipeline","dataStoreId":1,"pipelineGroupId":1,"dataSourceId":1,"validationSchemaId":1,"dataStoreDescription":"Temperature ingestion","pipelineReplication":2}'

# 6. Start the pipeline
curl -X POST $BASE/pipeline-lifecycle/start/1

# 7. Check status
curl $BASE/pipeline-lifecycle/status/1
```
