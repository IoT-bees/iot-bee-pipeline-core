# iot bees

Este repositorio contiene dos aplicaciones independientes:

- [`web/`](./web): frontend Next.js. Ejecuta `docker compose up` para abrirlo en `http://localhost:3000`.
- [`app/`](./app): backend Rust. Ejecuta `docker compose up` para exponer su API en `http://localhost:8080`.

Levanta primero `app/` y después `web/`. La URL del backend que usa la web se configura con `BACKEND_API_URL` o `INTERNAL_API_URL` en `web/docker-compose.yml`.

Para levantar una demo completa de pipeline (API, PostgreSQL, RabbitMQ, emisor
de telemetría y receptor webhook), ejecuta:

```bash
cd app
make demo-up
```

La guía de la demo está en [app/docs/DEMO_PIPELINE.md](./app/docs/DEMO_PIPELINE.md).
