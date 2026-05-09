# Validation Schemas API

Validation schemas define the structure and rules for incoming data in a pipeline.
Each schema maps **field names** to their type, constraints, and optional transformation expressions.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/validation-schemas` | Create a new schema |
| `GET` | `/validation-schemas` | List all schemas |
| `GET` | `/validation-schemas/{id}` | Get a schema by ID |
| `PUT` | `/validation-schemas/{id}/name` | Update schema name |
| `PUT` | `/validation-schemas/{id}/schema` | Replace the schema fields |
| `DELETE` | `/validation-schemas/{id}` | Delete a schema |

---

## Field Reference

### `schema` object — top level

Each key in `schema` is a **field name** (e.g. `"temperature"`) and its value is a `FieldSchema` object.

### `FieldSchema`

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `"float"` \| `"int"` \| `"bool"` | Yes | Expected data type of the incoming value |
| `required` | `boolean` | Yes | If `true`, the field must be present in every message |
| `default` | `number` \| `null` | Yes | Fallback value when the field is absent and `required = false`. Must be `null` if unused |
| `validation` | `ValidationRule` \| `null` | Yes | Numeric range constraints. Must be `null` to skip validation |
| `operation` | `Expr` \| `null` | Yes | Math expression to transform the field value before storing. `null` = pass-through |

### `ValidationRule`

| Field | Type | Description |
|---|---|---|
| `min` | `number` \| `null` | Minimum accepted value (inclusive). `null` = no lower bound |
| `max` | `number` \| `null` | Maximum accepted value (inclusive). `null` = no upper bound |

### `operation` — Expression (`Expr`)

Expressions are a recursive tree. Each node has a `"type"` discriminant:

| `type` | Fields | Description |
|---|---|---|
| `"num"` | `value: number` | Numeric constant |
| `"var"` | `name: string` | Reference to another field in the same message |
| `"bin_op"` | `op`, `left`, `right` | Binary arithmetic operation |

`op` values: `"Add"`, `"Sub"`, `"Mul"`, `"Div"`

`left` and `right` are themselves `Expr` nodes (recursive).

> **Example expression** — multiply field `raw_voltage` by constant `3.3`:
> ```json
> {
>   "type": "bin_op",
>   "op": "Mul",
>   "left":  { "type": "var", "name": "raw_voltage" },
>   "right": { "type": "num", "value": 3.3 }
> }
> ```

---

## POST /validation-schemas

```
POST /validation-schemas
Content-Type: application/json
```

### Request fields

| Field | Type | Constraints | Description |
|---|---|---|---|
| `name` | `string` | 1–32 chars, unique | Schema identifier |
| `schema` | `object` | At least one field | Map of field name → `FieldSchema` |

---

## Examples

### 1 — Single sensor: temperature only

```json
{
  "name": "temperature_sensor",
  "schema": {
    "temperature": {
      "type": "float",
      "required": true,
      "default": null,
      "validation": { "min": -40.0, "max": 125.0 },
      "operation": null
    }
  }
}
```

---

### 2 — Environmental station: temperature + humidity + pressure

```json
{
  "name": "environmental_station",
  "schema": {
    "temperature": {
      "type": "float",
      "required": true,
      "default": null,
      "validation": { "min": -40.0, "max": 85.0 },
      "operation": null
    },
    "humidity": {
      "type": "float",
      "required": true,
      "default": null,
      "validation": { "min": 0.0, "max": 100.0 },
      "operation": null
    },
    "pressure": {
      "type": "float",
      "required": false,
      "default": 1013.25,
      "validation": { "min": 300.0, "max": 1100.0 },
      "operation": null
    }
  }
}
```

---

### 3 — Mixed types: temperature (float) + active (bool) + count (int)

```json
{
  "name": "mixed_sensor",
  "schema": {
    "temperature": {
      "type": "float",
      "required": true,
      "default": null,
      "validation": { "min": -50.0, "max": 150.0 },
      "operation": null
    },
    "active": {
      "type": "bool",
      "required": true,
      "default": null,
      "validation": null,
      "operation": null
    },
    "packet_count": {
      "type": "int",
      "required": false,
      "default": 0,
      "validation": { "min": 0.0, "max": null },
      "operation": null
    }
  }
}
```

---

### 4 — With `operation`: Celsius to Fahrenheit conversion

The `raw_celsius` field is read from the message and stored as `temperature_f` after applying the formula `(raw_celsius × 9/5) + 32`.

```json
{
  "name": "fahrenheit_converter",
  "schema": {
    "temperature_f": {
      "type": "float",
      "required": true,
      "default": null,
      "validation": { "min": -148.0, "max": 302.0 },
      "operation": {
        "type": "bin_op",
        "op": "Add",
        "left": {
          "type": "bin_op",
          "op": "Mul",
          "left":  { "type": "var", "name": "raw_celsius" },
          "right": {
            "type": "bin_op",
            "op": "Div",
            "left":  { "type": "num", "value": 9.0 },
            "right": { "type": "num", "value": 5.0 }
          }
        },
        "right": { "type": "num", "value": 32.0 }
      }
    }
  }
}
```

---

### 5 — With `operation`: voltage divider (raw ADC → real voltage)

`voltage = raw_adc × 3.3 / 4095`

```json
{
  "name": "adc_voltage_reader",
  "schema": {
    "voltage": {
      "type": "float",
      "required": true,
      "default": null,
      "validation": { "min": 0.0, "max": 3.3 },
      "operation": {
        "type": "bin_op",
        "op": "Div",
        "left": {
          "type": "bin_op",
          "op": "Mul",
          "left":  { "type": "var", "name": "raw_adc" },
          "right": { "type": "num", "value": 3.3 }
        },
        "right": { "type": "num", "value": 4095.0 }
      }
    }
  }
}
```

---

## PUT /validation-schemas/{id}/name

```
PUT /validation-schemas/1/name
Content-Type: application/json

{
  "name": "new_schema_name"
}
```

| Field | Type | Constraints |
|---|---|---|
| `name` | `string` | 1–32 chars, unique |

---

## PUT /validation-schemas/{id}/schema

Replaces **all fields** of the schema. The same `schema` object format as in the POST request.

```
PUT /validation-schemas/1/schema
Content-Type: application/json

{
  "schema": {
    "temperature": {
      "type": "float",
      "required": true,
      "default": null,
      "validation": { "min": -40.0, "max": 85.0 },
      "operation": null
    }
  }
}
```

---

## GET /validation-schemas — Response

```json
[
  {
    "id": 1,
    "name": "environmental_station",
    "schema": "{\"temperature\":{\"type\":\"float\",\"required\":true,\"default\":null,\"validation\":{\"min\":-40.0,\"max\":85.0},\"operation\":null}}",
    "createdAt": "2026-05-06T15:00:00Z",
    "updatedAt": "2026-05-06T15:00:00Z"
  }
]
```

> Note: the `schema` field in responses is a **serialized JSON string**, not an object.

---

## GET /validation-schemas/{id} — Response

```json
{
  "name": "environmental_station",
  "schema": "{\"temperature\":{\"type\":\"float\",\"required\":true,...}}",
  "createdAt": "2026-05-06T15:00:00Z",
  "updatedAt": "2026-05-06T15:00:00Z"
}
```

---

## Errors

| Status | Cause |
|--------|-------|
| `400` | `name` empty or longer than 32 chars; invalid field type; `schema` empty |
| `404` | Schema ID not found |
| `409` | A schema with that `name` already exists |

---

## cURL Examples

```bash
# Create a schema
curl -X POST http://127.0.0.1:8080/validation-schemas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "temperature_sensor",
    "schema": {
      "temperature": {
        "type": "float",
        "required": true,
        "default": null,
        "validation": { "min": -40.0, "max": 125.0 },
        "operation": null
      }
    }
  }'

# List all schemas
curl http://127.0.0.1:8080/validation-schemas

# Get by ID
curl http://127.0.0.1:8080/validation-schemas/1

# Update name
curl -X PUT http://127.0.0.1:8080/validation-schemas/1/name \
  -H "Content-Type: application/json" \
  -d '{ "name": "temperature_sensor_v2" }'

# Replace schema fields
curl -X PUT http://127.0.0.1:8080/validation-schemas/1/schema \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "temperature": {
        "type": "float",
        "required": true,
        "default": null,
        "validation": { "min": -50.0, "max": 150.0 },
        "operation": null
      }
    }
  }'

# Delete
curl -X DELETE http://127.0.0.1:8080/validation-schemas/1
```
