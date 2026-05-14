# Design — Landing, Auth & Web App for iot-bee

**Date:** 2026-05-14
**Author:** Ovidio Andrade (with Claude)
**Status:** Draft, pending implementation plan

---

## 1. Goal

Ship a public-facing presence and an internal control plane for `iot-bee`:

- A **landing page** that explains the project to the open-source world in 10 seconds and shows how it is used.
- A **JWT-based auth system** added to the existing Rust backend.
- A **Next.js web app** that exposes every existing API module (pipelines, sources, stores, schemas, groups, lifecycle) behind login.
- A consistent, distinctive **brutalist dev-console** aesthetic across landing and app.
- **Responsive on mobile**, even though the primary use is desktop.

Everything ships as a single vertical slice (Approach 1) — one spec, one plan, one merge.

---

## 2. Decisions taken during brainstorming

| Decision | Outcome |
|---|---|
| Auth scope | Real auth in the Rust backend (JWT) + Next.js client. |
| UI language | English everywhere. |
| Aesthetic | Brutalist Dev Console: black base, neon green accent, all-monospace typography. |
| App shell | Top nav + persistent command bar (`⌘K`). |
| Responsive | Yes, required. Desktop-first but explicit breakpoints at 1024, 640. |
| Landing previews | Stylized HTML/SVG mockups (no real screenshots) to stay on-brand. |
| Where Next.js lives | New top-level `web/` directory in the existing repo. |
| Rollout | Single vertical slice, one PR. |

---

## 3. Repo & stack

```
iot-bee/
├── crates/                  # backend Rust (existing, +1 new aggregate)
├── src/                     # bin entry (existing)
├── migrations/              # SQLite, +1 new migration
├── docs/
├── web/                     # NEW — Next.js app
│   ├── app/
│   │   ├── (marketing)/     # landing, public
│   │   ├── (auth)/          # login, first-admin register
│   │   ├── (app)/           # protected by Next middleware
│   │   │   ├── page.tsx     # overview / dashboard
│   │   │   ├── pipelines/
│   │   │   ├── sources/
│   │   │   ├── stores/
│   │   │   ├── schemas/
│   │   │   ├── groups/
│   │   │   └── settings/
│   │   └── api/auth/        # thin route handlers: login, logout, register
│   ├── components/
│   ├── lib/
│   │   ├── api/             # client + endpoints + generated types
│   │   ├── hooks/           # react-query wrappers
│   │   ├── auth/            # session + guard
│   │   └── schemas/         # zod schemas
│   ├── test/
│   │   ├── msw/             # mock handlers
│   │   └── e2e/             # Playwright
│   ├── public/
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
└── Cargo.toml               # workspace, untouched
```

### Frontend stack

- **Next.js 15** (App Router) + **TypeScript** (strict).
- **Tailwind CSS v4** with design tokens defined as CSS variables.
- **@tanstack/react-query** for server state.
- **zustand** for UI state (command bar, toasts) — and only that.
- **react-hook-form** + **zod** for forms and validation.
- **lucide-react** for icons (mono-line).
- **cmdk** for the command palette.
- **openapi-typescript** to generate types from the backend's OpenAPI spec.
- **vitest** + **@testing-library/react** + **msw** for unit and integration tests.
- **playwright** for the e2e happy path.
- **pnpm** for package management.

### Typography

- Primary: **JetBrains Mono** (UI + code).
- Fallback: **Geist Mono**, `'Courier New'`, `monospace`.
- Weights used: 400, 600, 700. Nothing else.

### Backend additions (no structural changes)

- `argon2` crate for password hashing (Argon2id with sane defaults).
- `jsonwebtoken` crate for HS256 JWT issue/verify.
- Workspace additions are minimal; new aggregates follow the existing hexagonal pattern.
- CORS allowed origin: `http://localhost:3000` (dev), configurable via `CORS_ORIGINS`.

### Dev workflow

- `make run` → backend on `:8080`.
- `cd web && pnpm dev` → Next on `:3000`.
- `web/.env.local` points to `NEXT_PUBLIC_API_URL=http://localhost:8080`.

---

## 4. Backend auth design

### Migration

`migrations/0017_create_users_table.sql`:

```sql
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_email ON users(email);
```

### Layered code (hexagonal, matching existing convention)

```
crates/domain/auth/
├── entities/user.rs              # User, NewUser
├── value_objects/                # Email, PasswordHash, JwtClaims
├── inbound/auth_uses.rs          # AuthUseCases trait
├── outbound/
│   ├── user_repository.rs        # UserRepository trait
│   ├── password_hasher.rs        # PasswordHasher trait
│   └── token_issuer.rs           # TokenIssuer trait
└── error.rs                      # AuthError, wrapped into IoTBeeError

crates/application/auth_cases/cases.rs
crates/infrastructure/persistence/users_repository.rs       # SqliteUserRepository
crates/infrastructure/security/argon2_hasher.rs             # Argon2id
crates/infrastructure/security/jwt_issuer.rs                # HS256
crates/adapters/api/auth/
├── handlers.rs
├── models.rs
├── middleware.rs                 # JwtAuthMiddleware
└── routers.rs                    # auth_scope()
```

### Endpoints

| Method | Path | Body | Returns | Public? |
|---|---|---|---|---|
| `POST` | `/auth/register` | `{email, name, password}` | `201 {user, token}` | Yes (only when no users exist) |
| `POST` | `/auth/login` | `{email, password}` | `200 {user, token}` | Yes |
| `GET` | `/auth/has-users` | — | `200 {has_users: bool}` | Yes |
| `GET` | `/auth/me` | — (Bearer token) | `200 {user}` | No |

All existing routes (`/data-sources`, `/data-stores`, `/validation-schemas`, `/pipeline-groups`, `/pipelines`, `/pipeline-lifecycle/*`, `/connection-types`) are mounted inside a scope guarded by `JwtAuthMiddleware`. Public routes: `/auth/*`, `/swagger-ui/*`, `/api-docs/*`.

### First-run UX

- `GET /auth/has-users` is public.
- If it returns `{has_users: false}`, the Next.js login page shows "Create admin account" instead of "Login" and posts to `/auth/register`.
- Once one user exists, `POST /auth/register` returns `403 RegistrationDisabled`.
- This prevents accidental open-registration on an exposed instance.

### Config (env)

| Var | Required | Default |
|---|---|---|
| `JWT_SECRET` | yes (fail-fast at startup) | — |
| `JWT_EXPIRES_IN_HOURS` | no | `24` |
| `CORS_ORIGINS` | no | `http://localhost:3000` |

### Errors

`AuthError` is added as a variant of `IoTBeeError`; the existing `ResponseError` impl maps:

- `InvalidCredentials` → 401
- `EmailAlreadyTaken` → 409
- `RegistrationDisabled` → 403
- `InvalidToken` / `ExpiredToken` → 401
- `WeakPassword` → 400

---

## 5. Visual system

### Palette

| Token | Hex | Role |
|---|---|---|
| `bg.base` | `#0A0A0A` | page background |
| `bg.panel` | `#0D0D0D` | cards, inputs |
| `bg.elev` | `#1A1A1A` | hover, header strip |
| `accent` | `#00FF88` | primary action, running state |
| `accent.dim` | `#00CC6A` | hover state on accent |
| `danger` | `#FF5E5E` | errors, destructive |
| `warn` | `#FFB800` | warning, pending |
| `fg.0` | `#FFFFFF` | titles |
| `fg.1` | `#E8E8E8` | body |
| `fg.2` | `#CCCCCC` | muted body |
| `fg.3` | `#888888` | labels |
| `fg.4` | `#555555` | disabled, hints |

No gradients. No drop shadows. Separation is achieved through borders and contrast.

### Type scale

| Token | Size / line-height / letter-spacing | Usage |
|---|---|---|
| `display` | 36 / 1 / -2 | hero titles |
| `title` | 22 / 1.1 / -1 | page titles |
| `section` | 13 / — / +2 (uppercase) | section headings (`// RUNTIME`) |
| `body` | 13 / 1.55 / 0 | paragraphs |
| `mono` | 12 / 1.4 / 0 | code, command output |
| `label` | 10 / — / +2 (uppercase) | field labels, meta |

All monospace, JetBrains Mono.

### Spacing scale (4px base)

`1=4 · 2=8 · 3=12 · 4=16 · 6=24 · 8=32 · 12=48 · 16=64`

### Radii

- `2px` — small (buttons, pills, inputs)
- `3px` — panels
- `6px` — hero panels
Near-square by design.

### Status vocabulary

Pipeline states are surfaced everywhere with the same pill:

- `RUNNING` — accent border + dot
- `ERROR` — danger border + dot
- `STOPPED` / `IDLE` — fg.3 border + dot
- `STARTING` — warn border + dot

### Button rules (system invariants)

1. **Same row, same size, always.** Within a single `.btn-row` / action bar all buttons share the same height, padding, and font-size.
2. **`btn-tiny` is reserved for inline-in-table-row actions** (inside `<td class="actions">`). Never side-by-side with a regular `.btn`.
3. `.btn-row` defaults to `display: flex; align-items: center; gap: 12px; flex-wrap: wrap;`.

### Variants

- `btn-prim` — accent fill, black text, bold.
- `btn-ghost` — transparent, 1px border `#333`, hover border `accent`.
- `btn-danger` — transparent, 1px border + text `danger`.

---

## 6. Landing page (`/`)

### Sections in order

1. **Hero** — display title `ingest. validate. persist. repeat.` with neon-green accent on `validate.`; subtitle as monospace comment; two CTAs (`▸ launch demo` primary, `view on github` ghost). Nav strip at top: `iot-bee // · docs · api · github · ↗ launch app`. Hard metrics under the CTAs: `~0.4ms / per message`, `3 brokers supported`, `N replicas / pipeline`.
2. **Concept strip** — single horizontal diagram `BROKER → SCHEMA → STORE` with hover/tap reveal of each node's supported tech.
3. **Three pillars** — Ingest, Validate, Persist. Each column: short copy + an inline JSON snippet showing the payload at that stage.
4. **How it works** — four numbered steps (`01 / 02 / 03 / 04`) each pairing an explanatory paragraph with a stylized mockup of the matching app screen (create source / define schema / connect pipeline / start & monitor). Mockups reuse the in-app components so they stay accurate as the app evolves.
5. **Architecture peek** — SVG version of the actor hierarchy (`SystemActorSupervisor → PipelineSupervisor → Consumer/Processor/Store`) for developers who want to see what's inside.
6. **Code & self-host** — a terminal-style block with `git clone`, `sqlx migrate run`, `make run`. License: **MIT**. Tagline: **self-hosted, no telemetry**.
7. **Footer** — `MIT · v0.1.0 · github.com/.../iot-bee · made by Manuel Manjarres Rivera`.

### Responsive behavior

- **≥1024px**: full layout as described.
- **640–1023px**: 3 pillars become 2+1; `how it works` stacks vertically but mockup stays full-width.
- **<640px**: top nav collapses to `iot-bee // [≡]` drawer; hero display drops to 24px; metrics become 2 columns; CTAs become full-width and primary sticks to the bottom of the viewport until the user scrolls past the hero.

---

## 7. App pages (under `(app)/`)

| Route | Purpose |
|---|---|
| `/` (overview) | Global stats (running / errored / total) + table of latest pipelines + recent errors panel. |
| `/pipelines` | List with `#·name·source·schema·store·replicas·state` + inline actions (`edit`, `▸ start` / `■ stop`). |
| `/pipelines/new` | 5-step wizard: name → source → schema → store → replication. Sidebar of steps left, form right. |
| `/pipelines/[id]` | Detail with state header, start/stop buttons, relations panel (source/schema/store with `change`), transition history. |
| `/sources`, `/stores`, `/groups` | List + modal create + `/[id]/edit` page. |
| `/schemas` | List with field count and usage count. |
| `/schemas/[id]` | **Schema builder**: each field is an editable card (`name / type / required / default / min / max / operations[]`); operations are a reorderable list; JSON preview in a side panel. |
| `/settings` | Profile, change password, logout. |

### Shell

```
top nav: iot-bee // · pipelines · sources · stores · schemas · groups       ● ovidio
command bar: $ [____________________________________________]                       ⌘K
[ page content ]
footer: ● connected · api 127.0.0.1:8080            ▲ system: healthy
```

### Command bar

Built on `cmdk`. Resolves names against react-query caches:

- `start <pipeline-name>` → `POST /pipeline-lifecycle/start/{id}`
- `stop <pipeline-name>`
- `new pipeline` → navigates to wizard
- `go <module>` → navigates to module list

Open with `⌘K`. On mobile, the command bar collapses to a floating `⌘` button that opens a fullscreen modal.

### Form pattern

- `react-hook-form` for state.
- `zod` schemas in `lib/schemas/` mirror backend DTOs.
- Submit / cancel sit in a `.btn-row` at the foot — same size, always.
- Inline errors render below the field as `× <message>` in `danger`.
- Multi-step wizard for pipelines: numbered progress `01/05 · 02/05 · ...`.

### Empty states

- `// no data sources yet` in `fg.3`.
- Single centered `+ CREATE FIRST SOURCE` CTA.
- App-level onboarding banner when `sources=0 ∧ stores=0 ∧ schemas=0`: guides toward creating a source first.

### Responsive

- **≥1024px**: as described.
- **640–1023px**: top tabs kept, command bar collapses to a `⌘K` button; tables hide non-critical columns (`schema`, `replicas`); horizontal scroll fallback.
- **<640px**: top nav becomes hamburger + drawer; command bar becomes a floating button (bottom-right) that opens fullscreen; **tables become stacked cards** (`#01 · temp-rabbit / RABBIT_MQ → 2 replicas / ● RUNNING / [edit] [stop]`); forms single-column; wizard goes from sidebar+form to step-only with a top progress strip.

---

## 8. API client, auth flow and state

### Auth flow

```
visitor → landing (/)
       → /login (form: email + password)
       → POST /api/auth/login (Next route handler)
         → POST {backend}/auth/login → {user, token}
         → Set-Cookie: iot_bee_session=<token>; HttpOnly; SameSite=Lax; Secure (in prod)
       → middleware.ts sees cookie → all /(app)/* allowed
       → page fetches attach Bearer token via lib/api/client.ts
       → logout: /api/auth/logout clears cookie, redirect /login
```

**HttpOnly cookie, not localStorage** — localStorage is readable from JS and trivially exfiltrated by XSS. HttpOnly + SameSite=Lax + Secure (in prod) keeps the token inaccessible to JS. The price is a thin layer of Next route handlers under `app/api/auth/{login,logout,register}/route.ts` that translate cookies into `Authorization: Bearer` for backend calls.

### Client structure

```
web/lib/
├── api/
│   ├── client.ts                # fetch wrapper, ApiError, Authorization injection
│   ├── types.generated.ts       # from openapi-typescript (not committed initially)
│   ├── types.ts                 # hand-written extensions
│   └── endpoints/
│       ├── auth.ts
│       ├── pipelines.ts
│       ├── sources.ts
│       ├── stores.ts
│       ├── schemas.ts
│       ├── groups.ts
│       └── lifecycle.ts
├── hooks/
│   ├── useAuth.ts
│   ├── usePipelines.ts
│   ├── usePipelineStatusLive.ts  # 5s polling
│   ├── useSources.ts
│   └── ...
└── auth/
    ├── session.ts                # getSession() server helper
    └── guard.tsx                 # <RequireAuth> client component
```

### Type generation

- `pnpm gen:api` runs `openapi-typescript` against `http://localhost:8080/api-docs/openapi.json` and writes `web/lib/api/types.generated.ts`.
- The generated file is **not** committed initially (regenerate from a running backend); add to `.gitignore`.

### React Query

- Default `staleTime: 30s` for list queries.
- `usePipelineStatusLive(id)`: `refetchInterval: 5s`, disabled when component unmounts.
- Mutations invalidate related queries (`createPipeline` → `pipelines.list`; `start/stop` → `pipelines.status`).
- React Query DevTools enabled only when `NODE_ENV === 'development'`.

### Error handling

- `ApiError { status, code, message }`.
- 401 → middleware clears cookie + redirect to `/login`.
- 403 / 404 / 409 / 500 → brutalist toast `× <message>` top-right, 4 seconds.
- 400 (validation) → render inline at the offending field.

### UI state (Zustand — minimal)

- `useCommandBar` — open/closed, query, results.
- `useToasts` — queue.

Everything else: CRUD in react-query, forms in react-hook-form, route state in the URL.

### Env (`web/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8080
AUTH_COOKIE_NAME=iot_bee_session
```

---

## 9. Testing & verification

### Backend (Rust)

| Layer | What | Type |
|---|---|---|
| `domain/auth` | email validation, password hash trait contract | unit |
| `application/auth_cases` | login OK / wrong password / register happy / duplicate email / disabled after first user | unit, mocked ports |
| `infrastructure/security/argon2_hasher` | hash round-trip, wrong-password rejection | unit |
| `infrastructure/security/jwt_issuer` | issue + verify, expired token rejected, tampered token rejected | unit |
| `infrastructure/persistence/users_repository` | CRUD against SQLite in-memory | integration |
| `adapters/api/auth` | 201/409 on register, 200/401 on login, middleware blocks unauth requests, existing routes now protected | integration with `actix-web::test::init_service` |

Each new test file is registered as a `[[test]]` entry in `Cargo.toml` (project convention from `CLAUDE.md`).

### Frontend (Next.js)

| Layer | What | Tool |
|---|---|---|
| `lib/api/client.ts` | adds Authorization, parses errors, raises ApiError, returns typed data | vitest |
| `lib/auth/session.ts` | reads / writes cookie, expiry | vitest |
| `lib/hooks/use*` | optimistic update + invalidation on mutation | vitest + RTL + MSW |
| Forms | zod inline validation, happy submit, server-error → toast | vitest + RTL + MSW |
| UI components (Button, Pill, CommandBar) | renders, states, button-row invariants | vitest + RTL |
| **E2E** | register → login → create source → create store → create schema → create pipeline → start → see running → stop → logout | Playwright |

MSW under `web/test/msw/` intercepts `NEXT_PUBLIC_API_URL` and replies with fixtures derived from the generated types.

### Completion checklist (before declaring done)

1. `cargo test` — all `[[test]]` binaries pass.
2. `cargo clippy --workspace -- -D warnings` clean.
3. `pnpm typecheck` clean.
4. `pnpm lint` clean.
5. `pnpm test` (vitest) green.
6. `pnpm test:e2e` (Playwright) green.
7. **Manual smoke**:
   - Run backend + frontend.
   - Open `http://localhost:3000` on desktop Chrome; verify landing.
   - DevTools responsive mode → iPhone SE (375px); verify landing + login + pipelines list as stacked cards.
   - Create admin → create source → create store → create schema → create pipeline → start → throughput visible → stop.
8. CORS: front (`:3000`) talks to back (`:8080`) without warnings.
9. `RUST_LOG=iot_bee=info` shows no panics or `ERROR` during the flow.

### Explicitly out of scope (YAGNI)

- Refresh tokens (24h JWT is sufficient for MVP).
- Multi-tenant / orgs.
- Roles other than `admin`.
- 2FA, email-based password reset (no SMTP infra).
- Production telemetry, analytics, error tracking.
- i18n (English only).
- Real-time websockets / SSE (5-second polling is enough; SSE is a follow-up).

---

## 10. Build sequence (preview)

The implementation plan (next skill, `writing-plans`) will sequence the work, but at this stage the natural order is:

1. Backend auth (migration, domain → application → infrastructure → adapters → middleware on existing routes).
2. CORS + OpenAPI tweaks needed by the frontend.
3. `web/` scaffold: Next.js, Tailwind, design tokens, base components (Button, Pill, Input, Panel, Toast, CommandBar shell).
4. Auth pages (login, first-admin register) wired against `/auth/*`.
5. Module pages (sources, stores, groups, schemas) one by one, each completing its CRUD before moving on.
6. Pipelines wizard + detail page + lifecycle controls.
7. Landing page.
8. Responsive sweep + manual smoke on a real phone viewport.
9. Test suite + e2e + verification checklist.

---

## 11. Open questions

None blocking. The following are deliberate defaults that can be revisited in implementation:

- Argon2 parameters (memory, iterations) — start with the crate defaults.
- Polling interval (5s) — can be tightened or moved to SSE in a later iteration.
- Exact wording of landing copy — to be refined during step 7 of the build sequence.
