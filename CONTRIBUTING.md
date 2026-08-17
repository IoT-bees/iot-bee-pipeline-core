# Contributing to iot-bee

Thank you for contributing! This guide explains our workflow so the team stays aligned.

---

## Workflow: GitFlow simplificado

Usamos un flujo de dos ramas permanentes:

```
feature/mi-feature  →  dev  →  main (producción)
```

### Ramas permanentes

| Rama | Propósito |
|------|-----------|
| `main` | Producción — siempre estable, solo recibe merges desde `dev` |
| `dev` | Última versión estable de desarrollo — base para todas las features |

### Reglas

- **Nunca** hagas commit directo a `main` ni a `dev`
- Las feature branches salen de `dev` y vuelven a `dev` via PR
- `dev` → `main` es un PR de release, requiere aprobación
- Las feature branches deben ser **cortas** (1–2 días max)
- PRs se mergean con **Squash merge** para mantener historial lineal

### Branch naming

```
<type>/<short-description>

feat/sensor-validation
fix/timeout-on-pipeline-start
chore/update-sqlx
docs/pipeline-lifecycle
refactor/actor-message-types
```

---

## Commit Messages — Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
<type>(optional scope): <short description>

feat(pipeline): add validation step for MQTT payloads
fix(adapters): correct reconnect logic on broker disconnect
chore: update Cargo dependencies
docs(domain): document pipeline lifecycle
refactor(application): extract actor supervision into module
test(infrastructure): add integration test for InfluxDB writer
```

### Allowed types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance (deps, tooling, config) |
| `docs` | Documentation only |
| `refactor` | Code restructure without behavior change |
| `test` | Adding or improving tests |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Scopes (optional but recommended)

Use crate names as scopes: `domain`, `application`, `infrastructure`, `adapters`, `logging`

---

## Pull Request Process

### Feature → dev

1. **Crea una branch desde `dev`**
   ```bash
   git checkout dev && git pull
   git checkout -b feat/mi-feature
   ```

2. **Haz commits pequeños y enfocados** siguiendo Conventional Commits

3. **Mantén tu branch actualizada** con `dev` via rebase
   ```bash
   git fetch origin
   git rebase origin/dev
   ```

4. **Abre un PR contra `dev`** con título en formato Conventional Commits
   - Describe *qué* y *por qué*, no *cómo*

5. **Requiere 1 aprobación** antes de mergear

6. **Squash merge** al mergear

### dev → main (release)

1. Abre un PR de `dev` → `main`
2. El título sigue el formato: `release: vX.Y.Z`
3. Requiere aprobación del equipo
4. Squash merge

---

## Workspace Structure

This is a Cargo workspace. Each crate has a specific responsibility:

| Crate | Responsibility |
|-------|---------------|
| `domain` | Core business entities and rules |
| `application` | Use cases and orchestration (actor system) |
| `infrastructure` | DB, broker, and external integrations |
| `adapters` | HTTP API and protocol adapters |
| `logging` | Tracing and log configuration |

When making changes, **scope your work to the relevant crate(s)** to keep PRs reviewable.

---

## Local Development

```bash
# Build the workspace
cargo build

# Run all tests
cargo test

# Check formatting
cargo fmt --check

# Run linter
cargo clippy -- -D warnings
```

Make sure `cargo fmt` and `cargo clippy` pass before opening a PR.

---

## Questions?

Open a GitHub Discussion or reach out to [@manuelmj](https://github.com/manuelmj).
