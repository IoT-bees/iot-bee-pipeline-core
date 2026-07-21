# Pipelines (Pipeline Data)

A pipeline wires together all the building blocks: a data source (where to read), a validation schema (what to expect), a data store (where to write), and a group (organizational unit). The `pipelineReplication` factor controls how many parallel actor replicas process data concurrently.

> Pipelines are created in an **inactive** state by default. Use the [Pipeline Lifecycle API](../pipeline_lifecycle/README.md) to start them.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pipelines` | Create a new pipeline |
| `GET` | `/pipelines` | List all pipelines |
| `GET` | `/pipelines/{id}` | Get a pipeline by ID |
| `DELETE` | `/pipelines/{id}` | Delete a pipeline |
| `GET` | `/pipelines/group/{group_id}` | List pipelines belonging to a group |
| `PUT` | `/pipelines/data_source/{pipeline_id}/{data_source_id}` | Assign a different data source |
| `PUT` | `/pipelines/store/{pipeline_id}/{data_store_id}` | Assign a different data store |
| `PUT` | `/pipelines/validation_schema/{pipeline_id}/{schema_id}` | Assign a different validation schema |
| `PUT` | `/pipelines/group/{pipeline_id}/{group_id}` | Move pipeline to a different group |

---

## Models

### `CreatePipelineDataRequest` (POST body)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | `string` | 1–30 chars, unique | Pipeline name |
| `dataStoreId` | `u32` | ≥ 1 | ID of the target data store |
| `pipelineGroupId` | `u32` | ≥ 1 | ID of the group this pipeline belongs to |
| `dataSourceId` | `u32` | ≥ 1 | ID of the data source to consume from |
| `validationSchemaId` | `u32` | ≥ 1 | ID of the validation schema to apply |
| `dataStoreDescription` | `string` | 1–255 chars | Human-readable description |
| `pipelineReplication` | `u32` | ≥ 1 | Number of parallel actor replicas |

---

### `PipelineDataResponse` (GET body)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `u32` | Unique identifier |
| `name` | `string` | Pipeline name |
| `isActive` | `bool` | Whether the pipeline is currently running |
| `dataStore` | `{ id, name }` | Assigned data store |
| `pipelineGroup` | `{ id, name }` | Assigned group |
| `dataSource` | `{ id, name }` | Assigned data source |
| `dataValidationSchema` | `{ id, name }` | Assigned validation schema |
| `createdAt` | `string` (ISO 8601) | Creation timestamp |
| `updatedAt` | `string` (ISO 8601) | Last update timestamp |

---

## Error Codes

| Status | When |
|--------|------|
| `201 Created` | Pipeline created |
| `204 No Content` | Pipeline deleted |
| `200 OK` | Pipeline(s) or update retrieved successfully |
| `400 Bad Request` | Validation failed or cannot delete an active pipeline |
| `404 Not Found` | Pipeline, group, data source, data store or schema not found |
| `500 Internal Server Error` | Database error |

> Deleting an **active** pipeline (one that is currently running) returns `400`. Stop it first using [`POST /pipeline-lifecycle/stop/{id}`](../pipeline_lifecycle/README.md).

All errors return `{ "error": "..." }`.

---

## cURL Examples

```bash
# Create a pipeline
curl -X POST http://127.0.0.1:8080/pipelines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "temperature-pipeline",
    "dataStoreId": 1,
    "pipelineGroupId": 1,
    "dataSourceId": 1,
    "validationSchemaId": 1,
    "dataStoreDescription": "Temperature data ingestion pipeline",
    "pipelineReplication": 2
  }'

# List all pipelines
curl http://127.0.0.1:8080/pipelines

# Get a specific pipeline
curl http://127.0.0.1:8080/pipelines/1

# List pipelines in a group
curl http://127.0.0.1:8080/pipelines/group/1

# Reassign data source
curl -X PUT http://127.0.0.1:8080/pipelines/data_source/1/3

# Reassign data store
curl -X PUT http://127.0.0.1:8080/pipelines/store/1/2

# Reassign validation schema
curl -X PUT http://127.0.0.1:8080/pipelines/validation_schema/1/4

# Move to a different group
curl -X PUT http://127.0.0.1:8080/pipelines/group/1/2

# Delete (pipeline must be stopped first)
curl -X DELETE http://127.0.0.1:8080/pipelines/1
```
