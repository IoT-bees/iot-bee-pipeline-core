# iot-bee

Este repositorio contiene dos aplicaciones independientes:

- [`web/`](./web): frontend Next.js
- [`app/`](./app): backend Rust

---

## Requisitos

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) LTS
- [pnpm](https://pnpm.io/)
- [just](https://github.com/casey/just) — task runner

## Setup inicial

Clona el repo y ejecuta:

```bash
just setup
```

Esto instala automáticamente Rust, Node.js, pnpm, las dependencias del proyecto y los git hooks.

---

## Desarrollo

```bash
# Levantar backend y frontend en paralelo
just dev

# Solo backend (Rust — API en http://localhost:8001)
just run-backend

# Solo frontend (Next.js — http://localhost:3000)
just run-frontend
```

Ver todos los comandos disponibles:

```bash
just
```

---

## Demo completa (pipeline con Docker)

Para levantar una demo completa (API, PostgreSQL, RabbitMQ, emisor de telemetría y receptor webhook):

```bash
cd app
make demo-up
```

La guía de la demo está en [app/docs/DEMO_PIPELINE.md](./app/docs/DEMO_PIPELINE.md).

---

## Contribuir

Lee [CONTRIBUTING.md](./CONTRIBUTING.md) para conocer el flujo de trabajo, convenciones de commits y proceso de PR.

