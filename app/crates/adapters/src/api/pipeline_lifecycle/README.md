# Pipeline Lifecycle

Controls the runtime state of a pipeline. Once a pipeline is created (via the [Pipelines API](../pipeline_data/README.md)), use these endpoints to start, stop and inspect it.

A running pipeline launches `pipelineReplication` parallel actor replicas. Each replica is composed of three actors:
- **Consumer** — reads messages from the data source broker.
- **Processor** — validates and applies transformations defined in the validation schema.
- **Store** — persists the processed data to the data store.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pipeline-lifecycle/start/{pipeline_id}` | Start a pipeline (creates all replicas) |
| `POST` | `/pipeline-lifecycle/stop/{pipeline_id}` | Stop a running pipeline (shuts down all replicas) |
| `GET` | `/pipeline-lifecycle/status/{pipeline_id}` | Get the health status of each replica |

---

## `POST /pipeline-lifecycle/start/{pipeline_id}`

Starts the pipeline with the given ID. All actor replicas are created and begin consuming data immediately.

| Path param | Type | Description |
|------------|------|-------------|
| `pipeline_id` | `u32` | Numeric pipeline ID |

### Responses

| Status | Description |
|--------|-------------|
| `200 OK` | Pipeline started successfully. Empty body. |
| `400 Bad Request` | Pipeline is already running or failed to start |
| `404 Not Found` | Pipeline not found |
| `409 Conflict` | Pipeline is already running |

---

## `POST /pipeline-lifecycle/stop/{pipeline_id}`

Gracefully shuts down all replicas of the running pipeline.

| Path param | Type | Description |
|------------|------|-------------|
| `pipeline_id` | `u32` | Numeric pipeline ID |

### Responses

| Status | Description |
|--------|-------------|
| `200 OK` | Pipeline stopped successfully. Empty body. |
| `400 Bad Request` | Operation failed |
| `404 Not Found` | Pipeline not found |
| `409 Conflict` | Pipeline is already stopped |

---

## `GET /pipeline-lifecycle/status/{pipeline_id}`

Returns the health status of every running replica for the pipeline.

| Path param | Type | Description |
|------------|------|-------------|
| `pipeline_id` | `u32` | Numeric pipeline ID |

### Response `200 OK` — `PipelineStatusResponse`

```json
{
  "pipeline_general_status": "Healthy",
  "replica_statuses": {
    "0": "Healthy",
    "1": "Degraded"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pipeline_general_status` | `string` | Overall status computed across all replicas |
| `replica_statuses` | `object` | Map of `replica_id (string)` → status string |

#### Status values

| Value | Meaning |
|-------|---------|
| `Healthy` | All three actors (consumer, processor, store) are running normally |
| `Idle` | At least one actor is idle (no messages being processed) |
| `Degraded` | At least one actor is in a degraded or failed state |

The `pipeline_general_status` is the **worst** status across all replicas.

### Error Responses

| Status | When |
|--------|------|
| `400 Bad Request` | Pipeline exists but could not determine status |
| `404 Not Found` | Pipeline not found |
| `500 Internal Server Error` | Internal actor communication failure |

All errors return `{ "error": "..." }`.

---

## Typical Workflow

```
1. POST /pipelines                        → create pipeline (inactive)
2. POST /pipeline-lifecycle/start/{id}   → start pipeline
3. GET  /pipeline-lifecycle/status/{id}  → monitor health
4. POST /pipeline-lifecycle/stop/{id}    → stop pipeline
5. DELETE /pipelines/{id}                → delete pipeline (optional)
```

---

## cURL Examples

```bash
# Start pipeline ID 1
curl -X POST http://127.0.0.1:8080/pipeline-lifecycle/start/1

# Stop pipeline ID 1
curl -X POST http://127.0.0.1:8080/pipeline-lifecycle/stop/1

# Get status of pipeline ID 1
curl http://127.0.0.1:8080/pipeline-lifecycle/status/1
```

### Example status response

```bash
$ curl http://127.0.0.1:8080/pipeline-lifecycle/status/1
{
  "pipeline_general_status": "Healthy",
  "replica_statuses": {
    "0": "Healthy",
    "1": "Healthy"
  }
}
```
