
# iot-bee

![Status](https://img.shields.io/badge/status-MVP%20%2F%20WIP-yellow)
![Rust](https://img.shields.io/badge/rust-2024%20edition-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

> **Author:** Manuel Manjarres Rivera

A Rust-based IoT data pipeline platform that ingests data from message brokers (RabbitMQ, MQTT, Kafka), validates and transforms it according to configurable schemas, and persists the results to external stores (InfluxDB, local logs).

---

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [IoT Pipeline Architecture](#iot-pipeline-architecture)
  - [High-Level System Architecture](#high-level-system-architecture)
  - [Actor System Hierarchy](#actor-system-hierarchy)
  - [Data Flow Inside a Replica](#data-flow-inside-a-replica)
  - [Crate Dependency Graph](#crate-dependency-graph)
- [Pipeline Lifecycle](#pipeline-lifecycle)
- [Validation Schema & AST VM](#validation-schema--ast-vm)
  - [Field Schema Structure](#field-schema-structure)
  - [AST Expression Trees](#ast-expression-trees)
  - [Bytecode Compilation & Execution](#bytecode-compilation--execution)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [REST API](#rest-api)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

---

## Overview

**iot-bee** is an open-source platform for building high-performance, concurrent IoT data ingestion pipelines. Each **pipeline** connects a message broker (RabbitMQ, MQTT, Kafka) to an external data store (InfluxDB, local log) through a configurable validation and transformation layer powered by an AST-based bytecode VM.

The platform emphasizes:
- **IoT pipeline-first design**: Everything revolves around the broker → validate → store pattern.
- **Replica-based concurrency**: Scale consumption by running N parallel workers for each pipeline.
- **Schema-driven validation**: Define field types, constraints, defaults, and arithmetic transformations in JSON.
- **Hexagonal architecture**: Clean separation between domain logic, use cases, infrastructure, and adapters.
- **Actor-based runtime**: Actix actors manage pipeline lifecycle, supervision, and fault isolation.

---

## Core Concepts

| Concept | Description |
|---|---|
| **Pipeline** | A complete data flow: DataSource → ValidationSchema → DataStore. Each pipeline can run with N concurrent replicas. |
| **Replica** | An independent worker that consumes from a data source, validates/transforms data via the AST VM, and writes to a data store. Multiple replicas increase throughput. |
| **Data Source** | Where IoT data originates. Supported types: **RabbitMQ** queue, **MQTT** topic, **Kafka** topic. Each source has connection params (URL, queue/topic name, consumer/client ID). |
| **Validation Schema** | JSON schema defining field types (`int`, `float`, `bool`, `string`), constraints (`min`, `max`, `required`), default values, and arithmetic operations (AST expressions). |
| **Data Store** | Where processed data is persisted. Supported types: **InfluxDB** (time-series DB with measurement/tags/fields) and **LocalLog** (append-only file). |
| **Pipeline Group** | Logical grouping of related pipelines for organizational purposes. |
| **AST VM** | Stack-based bytecode virtual machine that executes compiled arithmetic transformations on validated fields. |

---

## IoT Pipeline Architecture

### High-Level System Architecture

The following diagram shows how IoT data flows from external message brokers through the iot-bee platform to persistent storage:

```mermaid
graph TD
    subgraph "Broker Layer"
        RMQ["RabbitMQ\n(AMQP queue)"]
        MQTT["MQTT Broker\n(topic pattern)"]
        Kafka["Kafka\n(topic + group)"]
    end

    subgraph "iot-bee Platform"
        subgraph "API Layer"
            API["REST API\n:8080\n(Actix-Web)"]
            Swagger["Swagger UI\n/swagger-ui/"]
        end

        subgraph "Application Layer (Use Cases)"
            UC["PipelineLifecycleUseCase\nDataSourceUseCase\nDataStoreUseCase\nValidationSchemaUseCase"]
        end

        subgraph "Actor System Runtime"
            SAA["SystemActorSupervisor\n(singleton)"]
            
            subgraph "Pipeline 1 (N replicas)"
                PS1["PipelineSupervisor"]
                R1A["Replica 0\nConsumer→Processor→Store"]
                R1B["Replica 1\nConsumer→Processor→Store"]
            end
            
            subgraph "Pipeline 2 (M replicas)"
                PS2["PipelineSupervisor"]
                R2A["Replica 0\nConsumer→Processor→Store"]
            end
        end

        DB[("SQLite\nInternal DB\n(configs, schemas)")]
    end

    subgraph "Storage Layer"
        InfluxDB[("InfluxDB\n(time-series)")]
        LocalLog[("Local Log Files")]
    end

    API --> UC
    Swagger -.-> API
    UC --> DB
    UC --> SAA
    SAA --> PS1
    SAA --> PS2
    PS1 --> R1A
    PS1 --> R1B
    PS2 --> R2A

    RMQ -.->|consume| R1A
    MQTT -.->|subscribe| R1B
    Kafka -.->|poll| R2A

    R1A -.->|write| InfluxDB
    R1B -.->|write| LocalLog
    R2A -.->|write| InfluxDB

    classDef broker fill:#f4a261,stroke:#e76f51,stroke-width:2px
    classDef store fill:#2a9d8f,stroke:#264653,stroke-width:2px
    classDef actor fill:#457b9d,stroke:#1d3557,stroke-width:2px
    classDef api fill:#e9c46a,stroke:#f77f00,stroke-width:2px

    class RMQ,MQTT,Kafka broker
    class InfluxDB,LocalLog store
    class SAA,PS1,PS2,R1A,R1B,R2A actor
    class API,Swagger api
```

> **Pipeline**: Each pipeline connects one data source to one data store through a validation schema. Pipelines run with **N replicas** — independent workers that consume, validate, and store data concurrently. Replicas increase throughput by parallelizing broker consumption.

---

### Actor System Hierarchy

The actor system implements the `PipelineLifecycle` domain port. The HTTP API never interacts with actors directly — all operations flow through use cases:

```mermaid
graph TD
    API["REST API Handler\n(POST /pipeline-lifecycle/start)"]
    API --> UC["PipelineLifecycleUseCase"]

    UC -->|StartPipelineMsg| SAA["SystemActorSupervisor\n(singleton — OnceLock)"]

    SAA -->|manages| PS1["PipelineSupervisor\n(pipeline_id=1)"]
    SAA -->|manages| PS2["PipelineSupervisor\n(pipeline_id=2)"]
    SAA -->|manages| PSN["PipelineSupervisor\n(pipeline_id=N)"]

    PS1 -->|spawns & supervises| R1["ReplicaHandle[0]\n(Tokio tasks)"]
    PS1 -->|spawns & supervises| R2["ReplicaHandle[1]\n(Tokio tasks)"]

    R1 --> CA1["ConsumerActor\n(DataSource trait)"]
    R1 --> PA1["ProcessorActor\n(AST VM)"]
    R1 --> SA1["StoreActor\n(DataExternalStore trait)"]

    R2 --> CA2["ConsumerActor"]
    R2 --> PA2["ProcessorActor"]
    R2 --> SA2["StoreActor"]

    CA1 -.->|MPSC channel| PA1
    PA1 -.->|MPSC channel| SA1

    CA2 -.->|MPSC channel| PA2
    PA2 -.->|MPSC channel| SA2

    classDef supervisor fill:#e63946,stroke:#d00000,stroke-width:2px,color:#fff
    classDef replica fill:#457b9d,stroke:#1d3557,stroke-width:2px,color:#fff
    classDef actor fill:#2a9d8f,stroke:#264653,stroke-width:2px,color:#fff

    class SAA,PS1,PS2,PSN supervisor
    class R1,R2 replica
    class CA1,PA1,SA1,CA2,PA2,SA2 actor
```

**Responsibilities:**
- **SystemActorSupervisor**: Global registry of all running pipelines. Routes start/stop/status messages to the correct `PipelineSupervisor`.
- **PipelineSupervisor**: Owns all replicas for one pipeline. Spawns `ReplicaHandle`s on start, drops them on stop. Reports aggregate status.
- **ReplicaHandle**: Wraps three async Tokio tasks (consumer → processor → store) wired together via MPSC channels.
- **ConsumerActor**: Connects to the data source and forwards raw JSON messages downstream.
- **ProcessorActor**: Parses JSON, validates fields, runs AST transformations, forwards processed `HashMap<String, Value>`.
- **StoreActor**: Writes processed records to the external store (InfluxDB point write / log file append).

---

### Data Flow Inside a Replica

Each replica is an independent pipeline worker. The following sequence diagram shows how a single IoT message flows from broker to storage:

```mermaid
sequenceDiagram
    participant Broker as Message Broker<br/>(RabbitMQ/MQTT/Kafka)
    participant CA as ConsumerActor
    participant PA as ProcessorActor
    participant VM as AST Bytecode VM
    participant SA as StoreActor
    participant Store as External Store<br/>(InfluxDB/LocalLog)

    Broker-->>CA: raw JSON message<br/>{"temp":22.5,"hum":45}
    CA->>CA: deserialize to bytes
    CA->>PA: send via MPSC channel<br/>(DataConsumerRawType)
    
    PA->>PA: parse JSON → HashMap
    PA->>PA: check required fields
    PA->>PA: apply defaults (if missing)
    PA->>PA: validate min/max constraints
    
    alt field has operation
        PA->>VM: compile AST → bytecode
        VM->>VM: execute stack-based ops<br/>(temp * 1.8 + 32)
        VM-->>PA: transformed value
    end
    
    PA->>PA: construct processed record
    PA->>SA: send via MPSC channel
    
    SA->>Store: write (InfluxDB point / log line)
    Store-->>SA: ack / error
    
    alt write failed
        SA->>SA: log error + metrics
        SA->>SA: retry logic (optional)
    end
```

> **AST VM**: The validation schema is compiled into stack-based bytecode at pipeline start. The VM executes transformations like `(temperature * 1.8) + 32` (Celsius → Fahrenheit) without runtime parsing overhead.

---

### Crate Dependency Graph

iot-bee follows **Hexagonal (Ports & Adapters) Architecture**. Dependencies flow inward: outer layers depend on inner layers, never the reverse.

```mermaid
graph LR
    subgraph "Entry Points (Adapters)"
        main["iot-bee (bin)"]
        adapters["adapters\n(HTTP + Actors)"]
    end

    subgraph "Use Case Orchestration"
        application["application\n(Use Cases)"]
    end

    subgraph "Core Domain"
        domain["domain\n(Entities, Ports, AST VM)"]
    end

    subgraph "Infrastructure"
        infrastructure["infrastructure\n(Repositories, DataSources, DataStores)"]
    end

    subgraph "Cross-Cutting"
        logging["logging\n(tracing wrappers)"]
    end

    main --> adapters
    main --> application
    main --> infrastructure
    
    adapters --> application
    adapters --> domain
    adapters --> logging
    
    application --> domain
    application --> logging
    
    infrastructure --> domain
    infrastructure --> logging

    logging --> tracing["tracing\n(external crate)"]

    classDef entrypoint fill:#e63946,stroke:#d00000,stroke-width:2px,color:#fff
    classDef usecase fill:#f77f00,stroke:#d62828,stroke-width:2px,color:#fff
    classDef core fill:#2a9d8f,stroke:#264653,stroke-width:2px,color:#fff
    classDef infra fill:#457b9d,stroke:#1d3557,stroke-width:2px,color:#fff
    classDef util fill:#e9c46a,stroke:#ca6702,stroke-width:2px

    class main,adapters entrypoint
    class application usecase
    class domain core
    class infrastructure infra
    class logging util
```

---

## Pipeline Lifecycle

Pipelines transition through runtime states managed by the actor system. The internal database tracks the persisted state (Running, Stopped, Pending, Failed), while the actor system reports operational health (Healthy, Idle, Degraded).

### Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending: Pipeline created<br/>(config stored in DB)
    
    Pending --> Running: Start command<br/>(PipelineSupervisor spawns replicas)
    
    Running --> Stopped: Stop command<br/>(replicas join & terminate)
    Running --> Failed: Unrecoverable error<br/>(supervisor crash)
    Running --> Degraded: Partial failure<br/>(some replicas failed)
    
    Degraded --> Running: Manual restart<br/>or self-heal
    Degraded --> Stopped: Stop command
    Degraded --> Failed: All replicas failed
    
    Stopped --> Running: Restart command
    Stopped --> [*]: Pipeline deleted
    
    Failed --> Pending: Reset state
    Failed --> [*]: Pipeline deleted

    note right of Running
        Operational status:
        - Healthy: all replicas OK
        - Idle: no active consumption
        - Degraded: some replicas failed
    end note

    note right of Pending
        Persisted in DB but
        not yet started by
        actor system
    end note
```

**States:**
- **Pending**: Pipeline configuration is stored in SQLite, but the actor system has not yet spawned the supervisor.
- **Running**: `PipelineSupervisor` is active with N replicas consuming, processing, and storing data.
  - **Healthy**: All replicas report normal operation.
  - **Idle**: Replicas are running but no data is being consumed (empty queue/topic).
  - **Degraded**: Some replicas have crashed or are reporting errors; the pipeline is partially operational.
- **Stopped**: All replicas have been terminated cleanly. The pipeline can be restarted.
- **Failed**: An unrecoverable error occurred (e.g., supervisor crash, all replicas dead). Manual intervention required.

**API Operations:**
- `POST /pipeline-lifecycle/start/{id}` → Pending/Stopped → Running
- `POST /pipeline-lifecycle/stop/{id}` → Running → Stopped
- `GET /pipeline-lifecycle/status/{id}` → Returns current state + replica health

---

## Validation Schema & AST VM

The validation layer is the core transformation engine. Schemas define how raw JSON fields are parsed, validated, and transformed before storage.

### Field Schema Structure

Each field in the schema has:

| Property | Type | Description |
|---|---|---|
| `type` | `"int"` \| `"float"` \| `"bool"` \| `"string"` | Expected data type |
| `required` | `bool` | If `true`, the field must exist in the incoming message. If `false` and missing, the `default` value is used. |
| `default` | `Value` (optional) | Default value if the field is absent. Can be a number, string, bool, or null. |
| `validation.min` | `f64` (optional) | Minimum value constraint (for numeric types) |
| `validation.max` | `f64` (optional) | Maximum value constraint (for numeric types) |
| `operation` | `Expr` (optional) | AST expression tree for arithmetic transformation (e.g., Celsius → Fahrenheit) |

**Example schema:**

```json
{
  "temperature": {
    "type": "float",
    "required": true,
    "validation": {
      "min": -50.0,
      "max": 100.0
    },
    "operation": {
      "type": "bin_op",
      "op": "Add",
      "left": {
        "type": "bin_op",
        "op": "Mul",
        "left": { "type": "var", "name": "temperature" },
        "right": { "type": "num", "value": 1.8 }
      },
      "right": { "type": "num", "value": 32.0 }
    }
  },
  "humidity": {
    "type": "int",
    "required": false,
    "default": 50
  },
  "sensor_id": {
    "type": "string",
    "required": true
  }
}
```

This schema:
- Validates `temperature` is between -50 and 100, then transforms it: `(temperature * 1.8) + 32` (Celsius → Fahrenheit).
- Uses a default of `50` for `humidity` if missing.
- Requires `sensor_id` to be present as a string.

---

### AST Expression Trees

The `operation` field contains an **Abstract Syntax Tree (AST)** expression. The AST supports:

**Expression nodes:**
- `{ "type": "num", "value": 3.14 }` — constant numeric literal
- `{ "type": "var", "name": "temperature" }` — reference to an input field
- `{ "type": "bin_op", "op": "Add", "left": <Expr>, "right": <Expr> }` — binary operation

**Supported operators:**
- `Add` — addition (`+`)
- `Sub` — subtraction (`-`)
- `Mul` — multiplication (`*`)
- `Div` — division (`/`)

Expressions can nest arbitrarily: `((a * b) + c) / d`.

---

### Bytecode Compilation & Execution

At pipeline start, each field's `operation` AST is **compiled into stack-based bytecode** by the `Compiler`. The `Vm` (Virtual Machine) executes the bytecode at runtime without re-parsing the AST for each message.

**Bytecode instructions:**
- `PushConst(f64)` — push a constant onto the stack
- `PushVar(String)` — push a variable's value from the input record onto the stack
- `Add` / `Sub` / `Mul` / `Div` — pop two values, compute, push result

**Execution flow:**

1. **Compile** (once at startup):  
   AST `(temperature * 1.8) + 32` → bytecode:
   ```
   PushVar("temperature")
   PushConst(1.8)
   Mul
   PushConst(32.0)
   Add
   ```

2. **Execute** (per message):  
   Input: `{"temperature": 20.0}`  
   Stack trace:
   ```
   PushVar("temperature") → stack: [20.0]
   PushConst(1.8)          → stack: [20.0, 1.8]
   Mul                     → stack: [36.0]
   PushConst(32.0)         → stack: [36.0, 32.0]
   Add                     → stack: [68.0]
   Result: 68.0
   ```

**Benefits:**
- **Performance**: Bytecode execution is 10-100x faster than interpreting JSON AST on every message.
- **Safety**: Variables are resolved at runtime with explicit error handling (`VmError::UndefinedVar`).
- **Flexibility**: Arithmetic transformations are defined in JSON config, not Rust code.

---

## Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| **Language** | Rust | Edition 2024 |
| **HTTP framework** | Actix-web | 4.13+ |
| **Actor system** | Actix | 0.13+ |
| **Async runtime** | Tokio | 1.51+ (full features) |
| **Internal database** | SQLite | via SQLx 0.8 with macros |
| **Message brokers** | RabbitMQ | lapin 4.4 (AMQP 0.9.1) |
|  | MQTT | rumqttc / paho-mqtt |
|  | Kafka | rdkafka |
| **External stores** | InfluxDB | influxdb 0.8 (v2 API) |
|  | LocalLog | File append (no external deps) |
| **Serialization** | serde / serde_json | 1.0+ |
| **Validation** | validator | 0.20+ with derive macros |
| **API docs** | utoipa + Swagger UI | 5.0+ |
| **Logging** | tracing + tracing-subscriber | 0.3+ with env-filter |
| **Error handling** | thiserror | 2.0+ |

---

## Project Structure

```
iot-bee/
├── src/                        # Binary entry point
│   ├── main.rs                 # Startup: DB → actors → HTTP server
│   ├── config.rs               # Env-based config (OnceLock singleton)
│   └── composition/
│       ├── app_state.rs        # Dependency injection root
│       └── api_composition/    # HTTP server wiring
│
├── crates/
│   ├── domain/                 # Pure domain logic (no framework deps)
│   │   ├── entities/           # Aggregate roots & models
│   │   ├── value_objects/      # Validated value types
│   │   ├── inbound/            # PipelineLifecycle trait
│   │   ├── outbound/           # Repository & port traits
│   │   ├── ast/                # Schema compiler + bytecode VM
│   │   └── error.rs            # Unified error types
│   │
│   ├── application/            # Use cases (orchestration)
│   │   ├── connection_types_cases/
│   │   ├── data_sources_cases/
│   │   ├── data_store_cases/
│   │   ├── validation_schemas_cases/
│   │   ├── groups_cases/
│   │   ├── pipeline_data_cases/
│   │   └── pipeline_lifecycle_cases/
│   │
│   ├── infrastructure/         # Concrete implementations
│   │   ├── persistence/        # SQLite repositories
│   │   ├── data_source/        # RabbitMQ, MQTT, Kafka consumers
│   │   ├── data_processor/     # Schema-based processor
│   │   ├── data_external_persistence/  # InfluxDB, LocalLog writers
│   │   └── pipeline_component_factory/ # Factory pattern
│   │
│   ├── adapters/               # Entry points (HTTP + actors)
│   │   ├── api/                # REST handlers, models, routers
│   │   └── actor_system/       # Actix actor hierarchy
│   │       # See crates/adapters/src/actor_system/README.md
│   │
│   └── logging/                # Tracing init + AppLogger helper
│
├── migrations/                 # SQLite migration files (SQLx)
├── data/                       # SQLite database file (runtime)
├── docker-compose.yml          # Development infrastructure
├── Makefile                    # Build, run, test commands
└── docs/
    └── API.md                  # Full REST API reference
```

---

## Quick Start

### Prerequisites

- Rust toolchain (`rustup`) — stable, edition 2024
- `sqlx-cli` for running migrations: `cargo install sqlx-cli --features sqlite`
- A running message broker (RabbitMQ / MQTT / Kafka) for data ingestion
- An InfluxDB instance, or use `LOCAL_LOG` for development

### 1. Clone and prepare

```bash
git clone <repo-url>
cd iot-bee
mkdir -p data
```

### 2. Configure environment

Create a `.env` file (or export variables directly):

```env
DATABASE_URL=sqlite://data/iot-bee.db

# Server
API_HOST=127.0.0.1
API_PORT=8080

# Logging
RUST_LOG=info
```

### 3. Run database migrations

```bash
sqlx migrate run --database-url sqlite://data/iot-bee.db
```

### 4. Start the server

```bash
make run
# equivalent to: cargo fmt && cargo check && RUST_LOG=info cargo run
```

The server starts at `http://127.0.0.1:8080`.  
Swagger UI is available at `http://127.0.0.1:8080/swagger-ui/`.

---

## Configuration

### Server and Database

All configuration is read from environment variables at startup:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | SQLite connection string, e.g. `sqlite://data/iot-bee.db` |
| `API_HOST` | ❌ | `127.0.0.1` | HTTP server bind address |
| `API_PORT` | ❌ | `8080` | HTTP server port |
| `RUST_LOG` | ❌ | `info` | Log level filter (`trace`, `debug`, `info`, `warn`, `error`) |

---

### Data Source Configuration

Data sources are configured via the REST API at `/data-sources`. Each source type has specific connection parameters:

#### RabbitMQ

```json
{
  "name": "rabbitmq-prod",
  "sourceType": "RABBITMQ",
  "url": "amqp://user:pass@localhost:5672",
  "queue_name": "iot_sensor_data",
  "consumer_name": "iot-bee-consumer-1",
  "description": "Production RabbitMQ queue for sensor telemetry"
}
```

| Field | Description |
|---|---|
| `url` | AMQP connection URL (supports `amqp://` and `amqps://` schemes) |
| `queue_name` | Name of the queue to consume from |
| `consumer_name` | Consumer tag identifier (unique per connection) |

---

#### MQTT

```json
{
  "name": "mqtt-edge",
  "sourceType": "MQTT",
  "broker_url": "mqtt://broker.hivemq.com:1883",
  "topic": "iot/sensors/+/telemetry",
  "client_id": "iot-bee-mqtt-client",
  "description": "MQTT broker for edge device telemetry"
}
```

| Field | Description |
|---|---|
| `broker_url` | MQTT broker connection URL (`mqtt://` or `mqtts://` for TLS) |
| `topic` | MQTT topic pattern (supports wildcards: `+` single-level, `#` multi-level) |
| `client_id` | MQTT client identifier (must be unique per broker) |

---

#### Kafka

```json
{
  "name": "kafka-production",
  "sourceType": "KAFKA",
  "brokers": ["kafka-1:9092", "kafka-2:9092", "kafka-3:9092"],
  "topic": "iot-telemetry",
  "group_id": "iot-bee-consumer-group",
  "description": "Kafka cluster for production telemetry"
}
```

| Field | Description |
|---|---|
| `brokers` | Array of Kafka broker addresses (`host:port`) |
| `topic` | Kafka topic name to consume from |
| `group_id` | Consumer group ID (enables parallel consumption and offset tracking) |

---

### Data Store Configuration

Data stores are configured via `/data-stores`. Each store type has specific parameters:

#### InfluxDB

```json
{
  "name": "influxdb-timeseries",
  "storeType": "INFLUXDB",
  "url": "http://localhost:8086",
  "data_base": "iot_metrics",
  "measurement": "sensor_readings",
  "token": "your-influxdb-token",
  "tag_fields": ["sensor_id", "location"],
  "description": "InfluxDB v2 for time-series storage"
}
```

| Field | Description |
|---|---|
| `url` | InfluxDB server URL |
| `data_base` | Database (bucket) name |
| `measurement` | Measurement name (table equivalent in InfluxDB) |
| `token` | Authentication token (InfluxDB v2 API) |
| `tag_fields` | Array of field names to be stored as tags (indexed), others become fields |

---

#### LocalLog

```json
{
  "name": "local-debug-log",
  "storeType": "LOCAL_LOG",
  "log_name": "iot_data.log",
  "description": "Local file append for debugging"
}
```

| Field | Description |
|---|---|
| `log_name` | File name (created in the process working directory) |

---

## REST API

A full REST API reference is available in [docs/API.md](docs/API.md).

Interactive docs (Swagger UI) are served at runtime: `http://127.0.0.1:8080/swagger-ui/`

### Endpoint Summary

| Resource | Base path | Description |
|---|---|---|
| Connection Types | `/connection-types` | List available source/store type identifiers |
| Data Sources | `/data-sources` | Manage message broker connection configs (RabbitMQ, MQTT, Kafka) |
| Data Stores | `/data-stores` | Manage persistence destination configs (InfluxDB, LocalLog) |
| Validation Schemas | `/validation-schemas` | Manage field validation and transformation schemas (AST expressions) |
| Pipeline Groups | `/pipeline-groups` | Organize pipelines into logical groups |
| Pipelines | `/pipelines` | Create and manage pipeline configurations (source + schema + store) |
| Pipeline Lifecycle | `/pipeline-lifecycle` | Start, stop, restart, and inspect running pipeline replicas |

**Common operations:**
- `POST /pipelines` — Create a new pipeline (links data source, schema, store, group, replication count)
- `POST /pipeline-lifecycle/start/{id}` — Start pipeline (spawns N replicas)
- `GET /pipeline-lifecycle/status/{id}` — Check pipeline status (Healthy/Idle/Degraded + per-replica health)
- `POST /pipeline-lifecycle/stop/{id}` — Stop pipeline (graceful shutdown of replicas)

---

## Development

### Running the Server

```bash
# Format, type-check, and run
make run

# Run with custom log level
make run RUST_LOG=debug
make run RUST_LOG=trace

# Direct cargo run (without format/check)
RUST_LOG=info cargo run
```

The server starts at `http://127.0.0.1:8080`.  
Swagger UI is available at `http://127.0.0.1:8080/swagger-ui/`.

---

### Building

```bash
# Development build
cargo build

# Release build (optimized)
cargo build --release

# Check without building binaries
cargo check
```

---

### Code Quality

```bash
# Format code
cargo fmt

# Check formatting without modifying
cargo fmt -- --check

# Lint with Clippy
cargo clippy

# Clippy with pedantic warnings
cargo clippy -- -W clippy::pedantic
```

---

### Database Migrations

```bash
# Run all pending migrations
sqlx migrate run --database-url sqlite://data/iot-bee.db

# Revert last migration
sqlx migrate revert --database-url sqlite://data/iot-bee.db

# Show migration status
sqlx migrate info --database-url sqlite://data/iot-bee.db
```

---

### Docker Development Environment

The `docker-compose.yml` file provides development infrastructure (RabbitMQ, MQTT, Kafka, InfluxDB):

```bash
# Start all services
make start-container
# or: docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f
```

---

## Testing

### Test Organization

Tests are organized by architecture layer to match the hexagonal structure:

```bash
# Full workspace test suite (unit + integration)
make test

# Tests by layer
make test-domain           # Pure domain logic (no external deps)
make test-application      # Use case orchestration
make test-infrastructure   # Repository + data source/store implementations
make test-adapters         # HTTP handlers + actor system
```

---

### Unit vs Integration Tests

```bash
# Unit tests only (no external services required)
make test-unit

# Integration tests only (requires RabbitMQ, InfluxDB, SQLite)
make test-integration
```

**Integration test requirements:**
- **InfluxDB**: `http://localhost:8086` with a valid token
- **RabbitMQ**: `amqp://guest:guest@localhost:5672`
- **SQLite**: `DATABASE_URL=sqlite://data/test.db`

Set environment variables before running:

```bash
export DATABASE_URL=sqlite://data/test.db
export INFLUXDB_URL=http://localhost:8086
export INFLUXDB_TOKEN=your-test-token
make test-integration
```

---

### Running Specific Tests

```bash
# Test a specific crate
cargo test -p domain
cargo test -p adapters

# Test a specific file
cargo test --test influxdb_integration

# Test a specific function
cargo test test_pipeline_lifecycle

# Show test output (println! statements)
cargo test -- --nocapture

# Run ignored tests (e.g., long-running integration tests)
cargo test -- --include-ignored
```

---

### Test Coverage

```bash
# Install tarpaulin (once)
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html --output-dir ./coverage
```

---

### Contribution Guidelines

- **Code style**: Follow Rust standard conventions (`cargo fmt`, `cargo clippy`)
- **Tests**: Add unit tests for new domain logic, integration tests for I/O components
- **Documentation**: Update README.md and inline docs for new features
- **Commits**: Use conventional commit format (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- **Architecture**: Respect hexagonal layer boundaries:
  - `domain` → no external dependencies
  - `application` → orchestrates domain + ports
  - `infrastructure` → implements outbound ports
  - `adapters` → implements inbound ports (HTTP, actors)


---

## License


---

## Contact & Support

- **Author**: Manuel Manjarres Rivera
- **GitHub**: [github.com/manuemj/iot-bee](https://github.com/manuemj/iot-bee) <!-- TODO: update with actual repo URL -->
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: For questions and community support, use GitHub Discussions

---

**⭐ If you find iot-bee useful, please consider giving it a star on GitHub!**