# Admin & operator views

**Status:** draft
**Author:** Ovidio + Claude
**Date:** 2026-05-16

## Goal

Carve a clear line between the operator experience (day-to-day pipeline work) and the admin experience (system health, audit log, user management, organization settings). Both roles already exist in the backend; the gap is the UI surface and the data backing audit/system pages.

## Decisions captured

- **Roles:** only two formal roles, `admin` and `operator`. Anything else stays implicitly read-only (current middleware behavior). No `viewer` role.
- **Navigation:** TopNav is identical for everyone. Admins enter the admin panel through a new "Admin panel →" entry in the user dropdown menu (right above Sign out), rendered only when `user.role === "admin"`.
- **Billing:** keeps its top-level tab as today. The admin sidebar duplicates the link as a shortcut.
- **Audit log:** persist mutable actions to `audit_events` (table already exists, today only stdout is written). UI supports paginated list with filters by user, method, date range, status, and `path_contains` search.
- **System page:** four cards — dependencies health (DB, RabbitMQ), pipeline runtime summary, version/uptime/build info. **Deferred to a second iteration:** rate-limit/error counters.
- **Users:** create directly with a temporary password; change role; soft-deactivate (status flag, no row delete).

## Architecture

The admin panel is a second Next.js shell mounted at `/admin/*`, not a separate app. Auth is unchanged — the same `/api/auth/me` round trip drives the guard.

Two enforcement layers:

- **Frontend route guard** in `web/app/(admin)/admin/layout.tsx`: reads the user via `useAuthMe()`. If `user.role !== "admin"`, `redirect("/app")`.
- **Backend middleware `AdminOnly`** in `crates/adapters/src/api/ops_middleware.rs`, applied on top of `JwtAuth` and `RolePolicy` for the `/api/v1/admin` scope. Returns 403 if `claims.role != "admin"`.

The hexagonal layering is preserved: every new capability has a domain entity + ports, an application use case, an infrastructure repository, and an adapter/API router.

## Backend

### Audit persistence

`AuditLogMw` (`crates/adapters/src/api/ops_middleware.rs`) gains a constructor that takes an `Arc<dyn AuditRepository>`. Inside the response handler — after the inner service has produced a response — it spawns a `tokio::spawn` that calls `repo.record(...)`. The existing `AppLogger.info(...)` call is preserved. Spawning detaches the write from the request path so failures do not delay or fail the response.

The middleware only records non-GET/HEAD/OPTIONS, matching today's behavior.

### New domain aggregates

- `domain::audit::entities::AuditEvent`
- `domain::audit::outbound::AuditRepository` — `record(NewAuditEvent)`, `list(AuditFilter, Cursor, limit) -> (Vec<AuditEvent>, Option<Cursor>)`
- `domain::system::entities::SystemStatus` — value object with sub-records for `Dependency`, `RuntimeSummary`, `BuildInfo`
- `domain::system::outbound::SystemStatusProbe` — `probe() -> SystemStatus`
- Users and organization already have entities; we only add outbound contracts: `UpdateUserRoleUseCase`, `SetUserStatusUseCase`, `CreateUserAsAdminUseCase` (distinct from the registration flow because admin sets a temporary password and forces a flag on the user), `UpdateOrganizationUseCase`.

### New application use cases

One `cases.rs` per aggregate, following the existing `*_cases` pattern:

- `application::audit_cases::AuditUseCases::list(filter, cursor, limit)`
- `application::system_cases::SystemUseCases::status()`
- Extensions to `application::auth_cases` (or a new `application::user_admin_cases` if the file is already large) for the four user admin actions.
- `application::organization_cases::OrganizationUseCases::read()` and `update(patch)`.

### Infrastructure

- `infrastructure::persistence::repositories::audit_events_repository` (sqlx) — `record` is `INSERT`; `list` is a parameterized query with cursor pagination on `id DESC`. Indexes on `created_at` and `organization_id` already exist; add `idx_audit_events_user_id` in a follow-up migration if `list` queries by user_id show up slow.
- `infrastructure::system::status_probe::SystemStatusProbe` — receives `SqlitePool`, a `lapin::Channel` reference, and an `Arc<SupervisorPipelineBridge>`. `probe()` runs three pings with a 300ms timeout each (using `tokio::time::timeout`), aggregates results, and reads build info from compile-time env vars (`BUILD_COMMIT`, `BUILD_TIME`) plus a process-start `Instant` captured in `AppState::new()`.
- `infrastructure::persistence::repositories::users_repository` — already exists; extend with `update_role(id, role)`, `set_status(id, status)`, `list_by_org(org_id)`, `create_with_temp_password(NewUser)` (sets `must_reset_password = true`; needs a migration to add that column).
- `infrastructure::persistence::repositories::organization_repository` — new; reads/updates the org row scoped by `claims.organization_id`.

### Migration

`migrations/0021_users_must_reset_password.sql`:

```sql
ALTER TABLE users ADD COLUMN must_reset_password INTEGER NOT NULL DEFAULT 0;
```

Login flow does not change; the frontend reads this flag on the auth/me response and, when true, intercepts navigation to push the user to a `/auth/reset-password` screen (outside scope of this spec — flagged as the immediate follow-up).

### API surface

Mounted under `/api/v1/admin` with `JwtAuth + RolePolicy + AdminOnly + AuditLog` middlewares (audit on mutable admin actions too):

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/audit` | Query: `user_id`, `method`, `path_contains`, `status`, `from`, `to`, `cursor`, `limit` (default 50, max 200). Response: `{ items: AuditEvent[], next_cursor: string \| null }`. |
| GET | `/admin/system/status` | Aggregated probe. No body. |
| GET | `/admin/users` | Lists users in caller's `organization_id`. |
| POST | `/admin/users` | Body: `{ email, name, role, temp_password }`. Returns the created user (without hash). |
| PATCH | `/admin/users/{id}` | Body: subset of `{ role, status, name }`. Re-validates role against the allowed enum. |
| DELETE | `/admin/users/{id}` | Soft-delete: sets `status = 'disabled'`. Rejects deleting yourself. |
| GET | `/admin/organization` | Returns the caller's org. |
| PATCH | `/admin/organization` | Body: subset of `{ name, slug }`. `slug` is `UNIQUE` in the DB; on collision the handler returns 409 with `{ error: "slug already taken" }`. |

All endpoints return the standard `IoTBeeError` shape on failure.

### Composition

`src/composition/api_composition/api_composer.rs` gains an `admin_scope(state: &AppState) -> Scope` that wires the four routers behind the middleware stack. `app_state.rs` constructs the new use cases and repos; `main.rs` mounts the scope alongside the existing ones.

## Frontend

### Directory layout

```
web/app/(admin)/admin/
  layout.tsx              guard + AdminShell
  page.tsx                redirects to /admin/users
  users/page.tsx
  audit/page.tsx
  system/page.tsx
  organization/page.tsx
  billing/page.tsx        renders the same component as /billing/page.tsx

web/components/admin/
  AdminShell.tsx          header + sidebar + content slot
  AdminSidebar.tsx
  audit/AuditTable.tsx
  audit/AuditFilters.tsx
  system/StatusGrid.tsx
  system/StatusCard.tsx
  users/UsersTable.tsx
  users/CreateUserDialog.tsx
  users/UserRow.tsx
  organization/OrgForm.tsx

web/lib/api/endpoints/admin.ts
web/lib/hooks/useAudit.ts
web/lib/hooks/useSystemStatus.ts
web/lib/hooks/useAdminUsers.ts
web/lib/hooks/useOrganization.ts
```

### AdminShell

- Header: black strip with `[bee] admin · org=<name>` on the left and a single `← back to app` button on the right that links to `/app`. No nav tabs.
- Sidebar fixed at left with five entries: users, audit, system, organization, billing. Active state matches the existing mobile-drawer pattern (`border-l-[var(--color-accent)]` + `bg-[var(--color-bg-elev)]`).
- Content slot is `{children}`.

### TopNav change

`web/components/shell/TopNav.tsx` gains a conditional entry in the dropdown, between the `signed in as` block and the Sign out button:

```tsx
{user.role === "admin" && (
  <Link
    href="/admin"
    className="block px-4 py-3 text-[13px] text-[var(--color-fg-1)] hover:bg-[var(--color-bg-elev)] transition-colors border-b border-[#1f1f1f]"
  >
    → Admin panel
  </Link>
)}
```

Mobile drawer gets the same conditional entry above the Sign out button.

### Pages

- **users:** table of users in the org with columns email, name, role, status, created_at. Row actions: edit role (inline dropdown), deactivate (confirm dialog). Header button "Create user" opens `CreateUserDialog` (form with email, name, role, temp password — generated client-side, shown once, with copy-to-clipboard).
- **audit:** `AuditFilters` bar (user select, method select, status select, date range, path search) + paginated `AuditTable` (timestamp, user email + role badge, method+path, status, IP). Infinite scroll using `next_cursor`.
- **system:** four-card grid via `StatusCard` — dependencies (DB ping, RabbitMQ ping), runtime (active pipelines, replicas, msgs/last-hour if cheap to compute, otherwise omitted in this iteration), build info (commit short SHA, build time, uptime). Refetches every 10s via `useSystemStatus({ refetchInterval: 10_000 })`.
- **organization:** simple `OrgForm` (name, slug) with Save button. Slug validates client-side as `^[a-z0-9-]+$`.
- **billing:** re-exports the existing billing page component so admins have the shortcut without duplicating logic.

### Hooks

All wrap `useQuery`/`useMutation` from the same client used by `useSources`, `useStores`, etc. New endpoint helpers in `web/lib/api/endpoints/admin.ts` mirror the backend surface 1:1.

## Data flow

1. Admin clicks **Admin panel →** in the user dropdown. Next.js navigates to `/admin`, which redirects to `/admin/users`.
2. `(admin)/admin/layout.tsx` runs the guard before rendering the shell. If the user is not admin, it redirects to `/app`. (The backend also rejects; the frontend guard is purely for UX.)
3. Each admin page calls its hook; the hook hits `/api/v1/admin/...` through the same `client.ts` used elsewhere. Auth is the existing httpOnly cookie / Bearer header dance.
4. Mutations on `/admin/users`, `/admin/organization` are themselves audited by `AuditLogMw`, which now writes both to stdout and to `audit_events`.

## Errors

- 401 from any admin endpoint → existing behavior bounces to `/login`.
- 403 (non-admin reaching admin endpoint) → admin shell shows a full-page "You no longer have admin access" state with a single link back to `/app`. This handles the edge case where the role was demoted mid-session.
- Audit list failures fall back to the existing empty/error states already used in pipelines pages, kept consistent with the rest of the app.
- `SystemStatusProbe` uses a 300ms timeout per dependency; the response always returns 200 with each dependency tagged `ok: false` plus an error message on timeout/failure. This keeps the page from being "down" because one dependency is down.
- Create-user form surfaces backend validation errors inline (email taken, role invalid, password too short).

## Testing

- **Domain ports:** unit tests with in-memory fakes for `AuditRepository` and `SystemStatusProbe`.
- **Application:** existing pattern in `tests/auth_application.rs` — instantiate use cases with fakes, assert behavior (e.g., `DeactivateUser` rejects self-deactivation).
- **Infrastructure:** sqlx tests using the same SQLite container as the rest of the suite. New file `tests/audit_events_repository.rs` registered in `Cargo.toml`. Covers `record` + `list` with filters and cursor.
- **Adapter/API:** integration test `tests/admin_endpoints.rs` covering: 403 for operator on each admin endpoint, 200 for admin, audit log row appears after mutation, soft-deactivate flips status without deleting.
- **Frontend:** vitest tests for `AdminSidebar` (active-state class), `AuditFilters` (query-param serialization), `CreateUserDialog` (temp-password generation length + validation).
- **End-to-end smoke:** start the backend, log in as admin, navigate to `/admin/users`, create a user, see the create action in `/admin/audit`.

## Scope boundaries

In scope:

- Admin shell + four sections (users, audit, system, organization) + billing shortcut.
- Audit persistence + filters + cursor pagination.
- System status probe with three signals (deps, runtime, build/uptime).
- User CRUD with temp-password, role change, soft-deactivate.
- Organization name/slug edit.

Out of scope (explicit follow-ups):

- Rate-limit / error-rate counters on the system page.
- Email-based invitations (current MVP uses temp password).
- Force-reset-password screen on first login (the `must_reset_password` column is added so this can be plugged in next, but the screen itself is its own task).
- Cross-resource multi-tenant isolation (filtering pipelines/sources/stores/schemas/groups by `organization_id` everywhere). Already called out as the next big phase.

## Open questions

- `SupervisorPipelineBridge` is per-pipeline; `SystemActorSupervisor` (which would expose a global view of all pipelines/replicas) is wired in code but commented out in `actor_system/mod.rs` per CLAUDE.md. For this iteration the system probe queries the SQLite `pipelines` table for the count (already authoritative for "configured pipelines") and, where available, joins live status from whatever `AppState` exposes today. The implementation plan should confirm the concrete source for "live replica count" — if it requires turning on `SystemActorSupervisor`, that gets pulled into the plan as a precondition.
- If `msgs_last_hour` turns out to be expensive to compute, drop it from the runtime card in this iteration. Not a blocker.
