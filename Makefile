.PHONY: run fmt check \
        test test-unit \
        test-domain test-application test-infrastructure test-adapters \
        test-integration \
        start-container

# ── Configuración ──────────────────────────────────────────────────────────────
RUST_LOG ?= info

# ── Run ───────────────────────────────────────────────────────────────────────
# Aplica formato, verifica que compila y luego lanza la aplicación.
run:
	cargo fmt
	cargo check
	RUST_LOG=$(RUST_LOG) cargo run

# ── Tests por capa ────────────────────────────────────────────────────────────
test-domain:
	cargo test -p domain

test-application:
	cargo test -p application

test-infrastructure:
	cargo test -p infrastructure

test-adapters:
	cargo test -p adapters

# ── Todos los tests no-integración ────────────────────────────────────────────
# Excluye los test binaries que conectan a servicios externos.
test-unit:
	cargo test -p domain
	cargo test -p application
	cargo test -p infrastructure --test data_processor
	cargo test -p adapters --test data_store_api

# ── Solo tests de integración ─────────────────────────────────────────────────
# Requieren servicios externos (InfluxDB, RabbitMQ, DB) levantados.
test-integration:
	cargo test --test influxdb_integration
	cargo test --test actor_system_test -- --include-ignored
	cargo test -p adapters --test pipeline_integration
	cargo test -p infrastructure --test influxdb_persistence
	cargo test -p infrastructure --test data_store_repository

# ── Docker ───────────────────────────────────────────────────────────────────
start-container:
	docker compose up -d

# ── Todos los tests del workspace ─────────────────────────────────────────────
test:
	cargo test --workspace
