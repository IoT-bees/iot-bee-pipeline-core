# Connection Types

Returns the list of data source protocols supported by the platform. This is a static, read-only catalogue used when creating a new Data Source.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/connection-types` | Returns all available connection type identifiers |

---

## `GET /connection-types`

No authentication or request body required.

### Response `200 OK`

```json
[
  { "source_type": "RABBITMQ" },
  { "source_type": "MQTT" },
  { "source_type": "KAFKA" }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `source_type` | `string` | Protocol identifier. Possible values: `RABBITMQ`, `MQTT`, `KAFKA` |

### Error Codes

This endpoint has no failure scenarios — it returns a static list and always responds `200 OK`.

---

## cURL Example

```bash
curl -X GET http://127.0.0.1:8080/connection-types \
  -H "Accept: application/json"
```

---

## Notes

- The returned identifiers are the valid values for `dataSourceConfiguration.sourceType` when creating a Data Source.
- See [Data Sources README](../data_sources/README.md) for how to use these values.
