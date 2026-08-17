# Contributing to iot-bee

Thank you for contributing! This guide explains our workflow so the team stays aligned.

---

## Workflow: Trunk-Based Development

We use **trunk-based development**. The `main` branch is always in a releasable state.

### Rules

- `main` is the trunk — **never commit directly to it**
- Feature branches must be **short-lived** (1–2 days max)
- All changes go through a **Pull Request** with at least **1 approval**
- PRs are merged using **Squash merge** to keep a linear history
- If a branch lives more than 2 days, use **feature flags** instead of long-lived branches

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

1. **Create a short-lived branch** from `main`
   ```bash
   git checkout main && git pull
   git checkout -b feat/my-feature
   ```

2. **Make small, focused commits** following Conventional Commits

3. **Keep your branch up to date** with `main` using rebase (not merge)
   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Open a PR** against `main` with a clear title and description
   - Title must follow Conventional Commits format
   - Describe *what* and *why*, not *how*

5. **Request a review** — at least 1 approval is required

6. **Squash merge** — the PR author or reviewer squashes on merge

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
