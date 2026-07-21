# ==============================================================================
# Stage 1 — Compile the Rust binary
# ==============================================================================
FROM rust:1-slim-bookworm AS builder

# System deps required by SQLx/PostgreSQL, lapin/influxdb (openssl),
# and utoipa-swagger-ui build script (curl to download Swagger UI assets)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        pkg-config \
        libssl-dev \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests first so that cargo can resolve the dependency graph.
# The actual source is copied afterwards so that dependency compilation is cached
# as a separate layer and only re-runs when Cargo.toml / Cargo.lock change.
COPY Cargo.toml Cargo.lock ./
COPY crates/domain/Cargo.toml        crates/domain/
COPY crates/application/Cargo.toml   crates/application/
COPY crates/infrastructure/Cargo.toml crates/infrastructure/
COPY crates/adapters/Cargo.toml      crates/adapters/
COPY crates/logging/Cargo.toml       crates/logging/

# Create stub entry-points so `cargo build` can resolve all crates without the
# real source code. The build will fail at link time, which is expected here.
RUN mkdir -p src crates/domain/src crates/application/src \
             crates/infrastructure/src crates/adapters/src crates/logging/src \
    && echo 'fn main() {}' > src/main.rs \
    && for crate in domain application infrastructure adapters logging; do \
           echo '// stub' > crates/$crate/src/lib.rs; \
       done

# Warm up the dependency cache (failure is normal — stubs are incomplete)
RUN cargo build --release 2>/dev/null || true

# Now copy the real source and rebuild only the changed crates
COPY src ./src
COPY crates ./crates
# Las migraciones se embeben en el binario en tiempo de compilación via sqlx::migrate!().
COPY migrations_postgres ./migrations_postgres

# Touch entry-points to tell cargo the sources changed
RUN find src crates -name "*.rs" | xargs touch

RUN cargo build --release --bin iot-bee

# ==============================================================================
# Stage 2 — Minimal runtime image
# ==============================================================================
FROM debian:bookworm-slim AS runtime

# Runtime dependencies: PostgreSQL client library + TLS root certificates
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        libssl3 \
        ca-certificates \
        wget \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for least-privilege execution.
# UID/GID fijos para ejecutar el servicio con mínimos privilegios.
RUN groupadd --gid 1001 iotbee \
    && useradd --uid 1001 --gid 1001 \
               --home-dir /app \
               --shell /sbin/nologin \
               --no-create-home \
               iotbee

# Compiled binary
COPY --from=builder /app/target/release/iot-bee /usr/local/bin/iot-bee

# Entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /app
USER iotbee

# Default environment — override at runtime via docker-compose or `docker run -e`.
# Secrets (JWT_SECRET, ADMIN_PASSWORD) are NOT baked in; they must be provided
# externally so the container fails fast if missing.
ENV DATABASE_URL=postgres://iot_bee:iot_bee_dev@postgres:5432/iot_bee \
    API_HOST=0.0.0.0 \
    RUST_LOG=info \
    JWT_EXPIRES_IN_HOURS=24 \
    CORS_ORIGINS=http://localhost:3000 \
    ADMIN_EMAIL=admin@iot-bee.local \
    ADMIN_NAME=Admin

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
