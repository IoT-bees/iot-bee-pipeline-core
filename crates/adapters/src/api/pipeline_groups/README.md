# Pipeline Groups

Pipeline groups are organizational containers for pipelines. They provide a way to categorize and filter pipelines by logical unit (e.g., by site, device type, or department). A pipeline must belong to exactly one group.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pipeline-groups` | Create a new group |
| `GET` | `/pipeline-groups` | List all groups |
| `GET` | `/pipeline-groups/{id}` | Get a group by ID |
| `DELETE` | `/pipeline-groups/{id}` | Delete a group |

---

## Models

### `CreateGroupRequest` (POST body)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `name` | `string` | 1–30 chars, unique | Group name |
| `description` | `string` | 1–255 chars | Free-text description |

---

### `GroupResponse` (GET body)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `u32` | Unique identifier |
| `name` | `string` | Group name |
| `description` | `string` | Description |
| `createdAt` | `string` (RFC 3339 / ISO 8601) | Creation timestamp |
| `updatedAt` | `string` (RFC 3339 / ISO 8601) | Last update timestamp |

---

## Error Codes

| Status | When |
|--------|------|
| `201 Created` | Group created |
| `204 No Content` | Group deleted |
| `200 OK` | Group(s) retrieved |
| `400 Bad Request` | Validation failed (empty name, name too long, etc.) |
| `404 Not Found` | No group with the given ID |
| `409 Conflict` | Name already in use **or** group has pipelines assigned (cannot delete) |
| `500 Internal Server Error` | Database error |

> A group that still has pipelines cannot be deleted. Reassign or delete the pipelines first.

All errors return `{ "error": "..." }`.

---

## cURL Examples

```bash
# Create a group
curl -X POST http://127.0.0.1:8080/pipeline-groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "factory-floor-a",
    "description": "Pipelines for factory floor section A"
  }'

# List all groups
curl http://127.0.0.1:8080/pipeline-groups

# Get a specific group
curl http://127.0.0.1:8080/pipeline-groups/1

# Delete (must have no pipelines)
curl -X DELETE http://127.0.0.1:8080/pipeline-groups/1
```
