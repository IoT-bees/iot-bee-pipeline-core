# Data Processor

Módulo de procesamiento de datos de pipeline. Compila un esquema JSON una sola vez al inicializar y aplica transformaciones, validaciones y valores por defecto a cada registro entrante.

## Arquitectura

```
schema_json (str)
       │
       ▼
  PipelineDataProcessor::new()
       │  → deserializa HashMap<String, FieldSchema>
       │  → compila cada operación Expr → Program (bytecode)
       │  → almacena HashMap<String, CompiledField>
       │
       ▼
  process_data(DataConsumerRawType)
       │  → parse_record(): JSON → HashMap<String, f64>
       │  → process(): aplica lógica por campo
       │       ├─ campo ausente + required  →  error
       │       ├─ campo ausente + default   →  usa default
       │       ├─ campo ausente + opcional  →  omite campo
       │       ├─ field_type cast (Float/Int/Bool)
       │       ├─ validation (min/max)      →  error si falla
       │       └─ operation (Expr)          →  ejecuta en Vm
       │  → serializa resultado → DataConsumerRawType
       ▼
  HashMap<String, f64>  →  JSON string
```

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `ast.rs` | Tipos `Expr`, `Op` — árbol de expresiones |
| `compiler.rs` | `Compiler` — convierte `Expr` en bytecode (`Program`) |
| `vm.rs` | `Vm` — máquina de pila que ejecuta `Program` |
| `schemas.rs` | `FieldSchema`, `FieldType`, `ValidationRule` — desertialización del esquema |
| `data_process.rs` | `PipelineDataProcessor` — orquestador principal, implementa `DataProcessorActions` |

---

## Formato del esquema

El esquema es un objeto JSON plano donde cada clave es el nombre del campo de salida:

```json
{
  "nombre_campo": {
    "type": "float" | "int" | "bool",
    "required": true | false,
    "default": <número opcional>,
    "validation": { "min": <f64?>, "max": <f64?> },
    "operation": <Expr | null>
  }
}
```

> **Nota:** no existe wrapper `{ "version": ..., "fields": { ... } }`. El objeto raíz **es** el mapa de campos.

---

## Tipo `Expr` (campo `operation`)

Las expresiones se representan con un campo discriminante `"type"`:

```json
{ "type": "num",   "value": 1.8 }
{ "type": "var",   "name": "temperatura" }
{ "type": "bin_op","op": "Mul", "left": <Expr>, "right": <Expr> }
```

### Operadores (`op`)

| Valor JSON | Operación |
|---|---|
| `"Add"` | suma (`+`) |
| `"Sub"` | resta (`-`) |
| `"Mul"` | multiplicación (`×`) |
| `"Div"` | división (`÷`) |

> **Importante:** los operadores usan **PascalCase** (`"Add"`, `"Mul"`), no snake_case.

---

## Casos de configuración

### Caso 1 — Pass-through (sin operación)

El valor del campo de entrada se copia directamente al campo de salida.

```json
{
  "temperatura": {
    "type": "float",
    "required": true
  }
}
```

Entrada: `{"temperatura": 25.0}` → Salida: `{"temperatura": 25.0}`

---

### Caso 2 — Validación de rango

```json
{
  "temperatura": {
    "type": "float",
    "required": true,
    "validation": { "min": -40.0, "max": 85.0 }
  }
}
```

- Valor dentro del rango → pasa.
- Valor fuera del rango → `ProcessorError::ValidationFailed`.

---

### Caso 3 — Operación: variable × constante

Multiplica el valor de entrada por un número fijo.

```json
{
  "temperatura": {
    "type": "float",
    "required": true,
    "operation": {
      "type": "bin_op",
      "op": "Mul",
      "left":  { "type": "var", "name": "temperatura" },
      "right": { "type": "num", "value": 1.8 }
    }
  }
}
```

Entrada: `{"temperatura": 100.0}` → Salida: `{"temperatura": 180.0}`

---

### Caso 4 — Operación anidada (°C → °F)

```json
{
  "temperatura": {
    "type": "float",
    "required": true,
    "operation": {
      "type": "bin_op",
      "op": "Add",
      "left": {
        "type": "bin_op",
        "op": "Mul",
        "left":  { "type": "var", "name": "temperatura" },
        "right": { "type": "num", "value": 1.8 }
      },
      "right": { "type": "num", "value": 32.0 }
    }
  }
}
```

Fórmula: `°F = °C × 1.8 + 32`

Entrada: `{"temperatura": 0.0}` → Salida: `{"temperatura": 32.0}`

---

### Caso 5 — Operación: variable − variable

Recibe dos campos de entrada y calcula la diferencia.

```json
{
  "diferencia": {
    "type": "float",
    "required": true,
    "operation": {
      "type": "bin_op",
      "op": "Sub",
      "left":  { "type": "var", "name": "valor_a" },
      "right": { "type": "var", "name": "valor_b" }
    }
  }
}
```

Entrada: `{"valor_a": 10.0, "valor_b": 3.0}` → Salida: `{"diferencia": 7.0}`

---

### Caso 6 — Campo opcional con valor por defecto

Si el campo no viene en el mensaje de entrada, se usa `default`.

```json
{
  "presion": {
    "type": "float",
    "required": false,
    "default": 1013.25
  }
}
```

- Entrada con `presion` → usa el valor recibido.
- Entrada sin `presion` → salida: `{"presion": 1013.25}`.

---

### Caso 7 — Campo opcional sin valor por defecto

Si el campo no viene, simplemente se omite del resultado.

```json
{
  "valor_extra": {
    "type": "float",
    "required": false
  }
}
```

- Entrada con `valor_extra` → incluido en la salida.
- Entrada sin `valor_extra` → campo ausente en la salida (no error).

---

### Caso 8 — Tipo booleano

Los valores booleanos de entrada (`true`/`false`) se convierten a `1.0`/`0.0`.

```json
{
  "activo": {
    "type": "bool",
    "required": true
  }
}
```

Entrada: `{"activo": true}` → Salida: `{"activo": 1.0}`

---

### Caso 9 — Múltiples campos

Se pueden combinar todos los casos anteriores en un solo esquema:

```json
{
  "temperatura": {
    "type": "float",
    "required": true,
    "operation": {
      "type": "bin_op", "op": "Add",
      "left": { "type": "bin_op", "op": "Mul",
                "left":  { "type": "var", "name": "temperatura" },
                "right": { "type": "num", "value": 1.8 } },
      "right": { "type": "num", "value": 32.0 }
    }
  },
  "humedad": {
    "type": "float",
    "required": true,
    "operation": {
      "type": "bin_op", "op": "Mul",
      "left":  { "type": "var", "name": "humedad" },
      "right": { "type": "num", "value": 2.0 }
    }
  },
  "presion": {
    "type": "float",
    "required": false,
    "default": 1013.25
  }
}
```

---

## Comportamiento para campos ausentes

| `required` | `default` | Campo en entrada | Resultado |
|---|---|---|---|
| `true` | — | presente | procesado normalmente |
| `true` | — | ausente | **error** `MissingRequiredField` |
| `false` | `Some(v)` | presente | procesado normalmente |
| `false` | `Some(v)` | ausente | valor = `v` (default) |
| `false` | `None` | presente | procesado normalmente |
| `false` | `None` | ausente | campo omitido en salida |

---

## Errores

| Error | Causa |
|---|---|
| `ProcessorError::MissingRequiredField(name)` | campo `required=true` no presente en la entrada |
| `ProcessorError::ValidationFailed(name, value)` | valor fuera de `min`/`max` |
| `ProcessorError::VmError(msg)` | fallo interno al ejecutar la operación en la VM |
| `IoTBeeError` (parse) | JSON de entrada malformado o campo no numérico |

---

## Uso

```rust
use infrastructure::data_processor::PipelineDataProcessor;
use domain::outbound::DataProcessorActions;

let schema = r#"{
  "temperatura": {
    "type": "float",
    "required": true,
    "operation": {
      "type": "bin_op", "op": "Mul",
      "left":  { "type": "var", "name": "temperatura" },
      "right": { "type": "num", "value": 1.8 }
    }
  }
}"#;

let processor = PipelineDataProcessor::new(schema)?;

let input = r#"{"temperatura": 100.0}"#.to_string();
let output = processor.process_data(input).await?;
// output ≈ r#"{"temperatura":180.0}"#
```
