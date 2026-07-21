 
# iot bees API
 
> **Status:** MVP / Work in Progress  
> **Author:** Manuel Manjarres Rivera

Backend Rust independiente de iot bees. Recibe datos desde brokers (RabbitMQ, MQTT, Kafka), los valida y transforma, y los persiste en destinos externos (InfluxDB, webhook o registros locales).

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Pipeline demo](#demo-de-pipeline)
- [Configuration](#configuration)
- [API](#api)
- [Development](#development)
- [Testing](#testing)

---

## Overview

iot-bee lets you define **pipelines** that connect a data source to a data store through a validation/transformation layer. Each pipeline can run with multiple **replicas** (concurrent workers) and is managed at runtime through a REST API backed by an Actix actor system.

**Core concepts:**

| Concept | Description |
|---|---|
| **Data Source** | Where raw data comes from — RabbitMQ queue, MQTT topic, or Kafka topic |
| **Validation Schema** | JSON schema that defines field types, constraints, defaults, and arithmetic transformations |
| **Data Store** | Where processed data is persisted — InfluxDB measurement, webhook or a local log file |
| **Pipeline** | Wires a data source → validation schema → data store, with N replicas |
| **Pipeline Group** | Logical grouping of related pipelines |

---

## Architecture

```mermaid
graph TD
    Client["HTTP Client"] -->|REST API| API["Actix-Web HTTP Server\n:8080"]
    API -->|Use Cases| App["Application Layer\n(Use Cases)"]
    App -->|Repositories| DB["PostgreSQL\n(Internal DB)"]
    App -->|PipelineLifecycle trait| ActorSystem["Actor System\n(SystemActorSupervisor)"]

    ActorSystem -->|Spawns| PS1["PipelineSupervisor\n(Pipeline 1)"]
    ActorSystem -->|Spawns| PS2["PipelineSupervisor\n(Pipeline 2)"]

    PS1 --> R1["Replica 1\nConsumer → Processor → Store"]
    PS1 --> R2["Replica 2\nConsumer → Processor → Store"]
    PS2 --> R3["Replica 1\nConsumer → Processor → Store"]

    R1 -->|reads| RMQ["RabbitMQ / MQTT / Kafka"]
    R1 -->|writes| IDB["InfluxDB / Webhook / LocalLog"]
```

### Crate dependency graph

```mermaid
graph LR
    main["iot-bee (bin)"] --> adapters
    main --> application
    main --> infrastructure
    adapters --> application
    adapters --> domain
    application --> domain
    infrastructure --> domain
    logging --> tracing
    adapters --> logging
    application --> logging
    infrastructure --> logging
```

### Data flow inside a running pipeline

```mermaid
sequenceDiagram
    participant Broker as Message Broker
    participant CA as ConsumerActor
    participant PA as ProcessorActor
    participant SA as StoreActor
    participant Store as External Store

    Broker-->>CA: raw message (JSON)
    CA->>PA: DataConsumerRawType (MPSC channel)
    PA->>PA: parse JSON → HashMap<String,Value>
    PA->>PA: validate min/max, apply operations (AST VM)
    PA->>SA: processed DataConsumerRawType (MPSC channel)
    SA->>Store: save (InfluxDB write / webhook delivery / log append)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Rust (edition 2024) |
| HTTP framework | Actix-web 4 |
| Actor system | Actix 0.13 |
| Async runtime | Tokio |
| Internal database | PostgreSQL via SQLx |
| Message brokers | RabbitMQ (lapin), MQTT, Kafka |
| External stores | InfluxDB 0.8, webhook, local log file |
| Serialization | serde / serde_json |
| Validation | validator |
| API docs | utoipa + Swagger UI |
| Logging | tracing / tracing-subscriber |

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
│   │   ├── persistence/        # PostgreSQL repositories
│   │   ├── data_source/        # RabbitMQ, MQTT, Kafka consumers
│   │   ├── data_processor/     # Schema-based processor
│   │   ├── data_external_persistence/  # InfluxDB, Webhook, LocalLog writers
│   │   └── pipeline_component_factory/ # Factory pattern
│   │
│   ├── adapters/               # Entry points (HTTP + actors)
│   │   ├── api/                # REST handlers, models, routers
│   │   └── actor_system/       # Actix actor hierarchy
│   │       # See crates/adapters/src/actor_system/README.md
│   │
│   └── logging/                # Tracing init + AppLogger helper
│
├── migrations_postgres/        # PostgreSQL migration files (SQLx)
├── docker-compose.yml          # Development infrastructure
├── Makefile                    # Build, run, test commands
└── docs/
    └── API.md                  # Full REST API reference
```

---

## Quick Start

### Prerequisites

- Rust toolchain (`rustup`) — stable, edition 2024
- `sqlx-cli` for running migrations: `cargo install sqlx-cli --features postgres`
- A running message broker (RabbitMQ / MQTT / Kafka) for data ingestion
- Un destino de salida: InfluxDB, un webhook HTTP o `LOCAL_LOG` para desarrollo

### 1. Clone and prepare

```bash
git clone <repo-url>
cd iot-bee/app
cp .env.example .env
```

### 2. Configure environment

Create a `.env` file (or export variables directly):

```env
DATABASE_URL=postgres://iot_bee:iot_bee_dev@localhost:5432/iot_bee

# Server
API_HOST=127.0.0.1
API_PORT=8080

# Logging
RUST_LOG=info

# Auth
JWT_SECRET=change-me-in-production-this-must-be-long-and-random
JWT_EXPIRES_IN_HOURS=24
CORS_ORIGINS=http://localhost:3000
```

### 3. Run database migrations

```bash
make migrate-postgres
```

### 4. Start the server

```bash
make run
# equivalent to: cargo fmt && cargo check && RUST_LOG=info cargo run
```

The server starts at `http://127.0.0.1:8080`.  
Swagger UI is available at `http://127.0.0.1:8080/swagger-ui/`.

### Production: Render + Vercel

The repository root includes `render.yaml`, which creates the `iot-bee-api`
web service and its PostgreSQL database. The API automatically uses Render's
`PORT` variable while keeping `API_PORT` for local development.

1. In Render, select **New + → Blueprint** and choose this repository.
2. Before creating the service, provide `JWT_SECRET` (at least 32 random
   characters), `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_NAME`, and
   `CORS_ORIGINS`. Set `CORS_ORIGINS` to the production Vercel origin, for
   example `https://app.example.com` (without a trailing slash).
3. Wait for the health check at `/health` to return `{"status":"ok"}`. The
   database migrations run automatically on startup.
4. In Vercel, set `BACKEND_API_URL` to the HTTPS URL assigned by Render, then
   redeploy the web application. Also set `AUTH_COOKIE_SECURE=1`.

If Stripe is enabled, set the same strong `STRIPE_SYNC_SECRET` in both Render
and Vercel. Issue an admin JWT from the production API and set it as
`SERVICE_ADMIN_TOKEN` only in Vercel.

### Desarrollo con Docker

```bash
cp .env.example .env
docker compose up --build
```

La API queda disponible en `http://localhost:8080`. Para conectarla al frontend, levanta el paquete `web/` por separado.
El contenedor observa los cambios en Rust y reinicia la API automáticamente.

### Demo de pipeline

Para levantar API, PostgreSQL y los servicios que alimentan una demo completa:

```bash
make demo-up
```

Inicia también el frontend desde `web/` para abrir `http://localhost:3000` y
cargar la plantilla desde la interfaz.

La plantilla **Cargar demo** del frontend usa RabbitMQ y entrega los registros
validados a un webhook local. Consulta la guía paso a paso en
[docs/DEMO_PIPELINE.md](docs/DEMO_PIPELINE.md).

---

## Configuration

All configuration is read from environment variables at startup:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string, e.g. `postgres://iot_bee:iot_bee_dev@localhost:5432/iot_bee` |
| `JWT_SECRET` | ✅ | — | Secret used to sign HS256 JWT access tokens. Must be long and random. |
| `JWT_EXPIRES_IN_HOURS` | ❌ | `24` | Access token lifetime in hours. |
| `CORS_ORIGINS` | ❌ | `http://localhost:3000` | Comma-separated list of CORS origins for the API. |
| `API_HOST` | ❌ | `127.0.0.1` | HTTP server bind address |
| `API_PORT` | ❌ | `8080` | HTTP server port |
| `RUST_LOG` | ❌ | `info` | Log level filter (`trace`, `debug`, `info`, `warn`, `error`) |

---

## API

A full REST API reference is available in [docs/API.md](docs/API.md).

Interactive docs (Swagger UI) are served at runtime: `http://127.0.0.1:8080/swagger-ui/`

### Endpoint summary

| Resource | Base path | Description |
|---|---|---|
| Auth | `/auth` | Login, first-admin register, current-user, has-users probe |
| Connection Types | `/connection-types` | List available source/store type identifiers |
| Data Sources | `/data-sources` | Manage message broker connection configs |
| Data Stores | `/data-stores` | Manage persistence destination configs |
| Validation Schemas | `/validation-schemas` | Manage field validation and transformation schemas |
| Pipeline Groups | `/pipeline-groups` | Organise pipelines into logical groups |
| Pipelines | `/pipelines` | Create/manage pipelines and their relations |
| Pipeline Lifecycle | `/pipeline-lifecycle` | Start, stop, and inspect running pipelines |

All routes except `/auth/*` and `/swagger-ui/*` require an `Authorization: Bearer <jwt>` header. The first request to `POST /auth/register` creates the admin user; subsequent registrations are rejected with `403 RegistrationDisabled`.

---

## Development

```bash
# Format + type-check + run
make run

# Run at debug log level
make run RUST_LOG=debug
```

---

## Testing

```bash
# Full workspace test suite
make test

# By architecture layer
make test-domain
make test-application
make test-infrastructure
make test-adapters

# Non-integration tests only
make test-unit

# Integration tests (requires external services)
make test-integration
```

> Integration tests require live external services (InfluxDB, RabbitMQ, etc.). Set the relevant environment variables before running them.

```
