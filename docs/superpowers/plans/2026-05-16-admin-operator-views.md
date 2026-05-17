# Admin & Operator Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only `/admin` shell in the web app (users, audit, system, organization, billing-shortcut) backed by new `/api/v1/admin` endpoints; persist mutable HTTP actions to `audit_events`; keep the operator UI unchanged except for one new entry inside the user dropdown.

**Architecture:** Hexagonal layers (domain → application → infrastructure → adapters) as already used in the repo. The admin panel is a second Next.js layout group (`(admin)/admin`). Backend admin endpoints sit behind a new `AdminOnly` middleware that runs after the existing `JwtAuth` + `RolePolicy`. `AuditLogMw` gains an `Arc<dyn AuditRepository>` so it can both log to stdout and persist a row via `tokio::spawn`. Reference spec: `docs/superpowers/specs/2026-05-16-admin-operator-views-design.md`.

**Tech Stack:** Rust 1.x (Actix-web 4, sqlx 0.8 SQLite, tokio, async-trait, utoipa, chrono), Next.js 14 App Router, React Query v5, vitest, Tailwind.

---

## File Structure

### Backend (created)

```
migrations/0021_users_must_reset_password.sql

crates/domain/src/
  audit/
    mod.rs
    entities/mod.rs
    entities/audit_event.rs
    outbound/mod.rs
    outbound/audit_repository.rs
    inbound/mod.rs
    inbound/audit_uses.rs
  system/
    mod.rs
    entities/mod.rs
    entities/system_status.rs
    outbound/mod.rs
    outbound/system_status_probe.rs
    inbound/mod.rs
    inbound/system_uses.rs
  organization/
    mod.rs
    entities/mod.rs
    entities/organization.rs
    outbound/mod.rs
    outbound/organization_repository.rs
    inbound/mod.rs
    inbound/organization_uses.rs
  auth/inbound/user_admin_uses.rs   (new file in existing folder)

crates/application/src/
  audit_cases/{mod.rs, cases.rs}
  system_cases/{mod.rs, cases.rs}
  organization_cases/{mod.rs, cases.rs}
  user_admin_cases/{mod.rs, cases.rs}

crates/infrastructure/src/
  persistence/repositories/audit_events_repository.rs
  persistence/repositories/organizations_repository.rs
  system/mod.rs
  system/status_probe.rs

crates/adapters/src/api/
  admin/
    mod.rs
    audit/{mod.rs, handlers.rs, models.rs, routers.rs}
    system/{mod.rs, handlers.rs, models.rs, routers.rs}
    users/{mod.rs, handlers.rs, models.rs, routers.rs}
    organization/{mod.rs, handlers.rs, models.rs, routers.rs}
    routers.rs   (admin_scope assembling the four sub-scopes)
```

### Backend (modified)

```
crates/domain/src/error.rs                       (+ AuditError, SystemError, OrgError, UserAdminError; wire into IoTBeeError)
crates/domain/src/auth/entities/user.rs          (+ must_reset_password field)
crates/domain/src/auth/outbound/user_repository.rs (+ list_by_org / update_role / set_status / create_as_admin)
crates/domain/src/mod.rs                         (+ pub mod audit/system/organization)
crates/application/src/lib.rs (or mod.rs)        (+ pub mod audit_cases/system_cases/etc.)
crates/infrastructure/src/persistence/repositories/users_repository.rs (+ new methods)
crates/infrastructure/src/persistence/repositories/mod.rs              (+ pub mod for new files)
crates/infrastructure/src/lib.rs (or mod.rs)     (+ pub mod system)
crates/adapters/src/api/ops_middleware.rs        (AuditLogMw takes Arc<dyn AuditRepository>; AdminOnly added)
crates/adapters/src/api/mod.rs                   (+ pub mod admin)
crates/adapters/src/api/auth/models.rs           (UserResponse + must_reset_password field)
crates/adapters/src/api/auth/handlers.rs         (user_resp includes new field)
crates/adapters/src/api/api_docs.rs              (add new schemas + paths)
src/composition/app_state.rs                     (+ getters for the four admin use cases + audit repo)
src/composition/api_composition/api_composer.rs  (wire admin_scope behind middleware stack)
```

### Frontend (created)

```
web/app/(admin)/layout.tsx                       (admin shell wrapper + role guard)
web/app/(admin)/admin/page.tsx                   (redirects to /admin/users)
web/app/(admin)/admin/users/page.tsx
web/app/(admin)/admin/audit/page.tsx
web/app/(admin)/admin/system/page.tsx
web/app/(admin)/admin/organization/page.tsx
web/app/(admin)/admin/billing/page.tsx

web/components/admin/AdminShell.tsx
web/components/admin/AdminSidebar.tsx
web/components/admin/audit/AuditTable.tsx
web/components/admin/audit/AuditFilters.tsx
web/components/admin/system/StatusCard.tsx
web/components/admin/system/StatusGrid.tsx
web/components/admin/users/UsersTable.tsx
web/components/admin/users/UserRow.tsx
web/components/admin/users/CreateUserDialog.tsx
web/components/admin/organization/OrgForm.tsx

web/lib/api/endpoints/admin.ts
web/lib/hooks/useAudit.ts
web/lib/hooks/useSystemStatus.ts
web/lib/hooks/useAdminUsers.ts
web/lib/hooks/useOrganization.ts

web/test/admin/AdminSidebar.test.tsx
web/test/admin/AuditFilters.test.tsx
web/test/admin/CreateUserDialog.test.tsx
```

### Frontend (modified)

```
web/lib/api/types.ts                             (+ AuditEvent, SystemStatus, AdminUser, Organization types)
web/components/shell/TopNav.tsx                  (conditional Admin panel entry)
```

### Tests (created at workspace root)

```
tests/audit_events_repository.rs
tests/user_admin_application.rs
tests/admin_endpoints_api.rs
tests/organization_application.rs
```

---

## Task 1: Migration — `must_reset_password` flag

**Files:**
- Create: `migrations/0021_users_must_reset_password.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add a flag so admin-created users can be forced to reset their password
-- on first login. Defaults to 0 (false) for all existing users.
ALTER TABLE users ADD COLUMN must_reset_password INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Apply the migration locally**

Run: `sqlx migrate run`
Expected: `Applied 0021/migrate users must reset password`. Re-running is a no-op (sqlx tracks `_sqlx_migrations`).

- [ ] **Step 3: Verify column exists**

Run: `sqlite3 data/iot_bee.db ".schema users"`
Expected: `must_reset_password INTEGER NOT NULL DEFAULT 0` in the output.

- [ ] **Step 4: Commit**

```bash
git add migrations/0021_users_must_reset_password.sql
git commit -m "feat(db): add must_reset_password flag to users"
```

---

## Task 2: Domain — extend `User` with `must_reset_password`

**Files:**
- Modify: `crates/domain/src/auth/entities/user.rs`

- [ ] **Step 1: Add the field to `User` and `NewUser`**

```rust
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct User {
    pub id: i64,
    pub organization_id: i64,
    pub email: String,
    pub name: String,
    pub password_hash: String,
    pub role: String,
    pub status: String,
    pub must_reset_password: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct NewUser {
    pub organization_id: i64,
    pub email: String,
    pub name: String,
    pub password_hash: String,
    pub role: String,
    pub status: String,
    pub must_reset_password: bool,
}
```

- [ ] **Step 2: Run cargo check to find usages that need updating**

Run: `cargo check -p domain`
Expected: PASS (domain crate compiles).

Run: `cargo check`
Expected: FAILS in `infrastructure` (`SqliteUserRepository`), `application` (`AuthUseCasesImpl::register`), `src/composition/app_state.rs` (`ensure_default_admin`), and `tests/auth_application.rs`. Each constructs `User` / `NewUser` literals and needs the new field. The next tasks handle these.

- [ ] **Step 3: Patch each construction site to set `must_reset_password: false`** except admin-created users (handled in a later task).

Edit each of these files; in every `User { ... }` and `NewUser { ... }` struct literal, add `must_reset_password: false,`:

- `tests/auth_application.rs` — both the `InMemRepo::create` builder and any test that constructs `User` directly.
- `crates/application/src/auth_cases/cases.rs` — inside `AuthUseCasesImpl::register`, add `must_reset_password: false` to the `NewUser`.
- `src/composition/app_state.rs` — inside `ensure_default_admin`, add `must_reset_password: false` to the `NewUser`.

The `SqliteUserRepository` is handled in Task 3.

- [ ] **Step 4: Run check again**

Run: `cargo check`
Expected: still failing on `crates/infrastructure/src/persistence/repositories/users_repository.rs` (handled next).

---

## Task 3: Infrastructure — read & write `must_reset_password` in `SqliteUserRepository`

**Files:**
- Modify: `crates/infrastructure/src/persistence/repositories/users_repository.rs`

- [ ] **Step 1: Update both SELECTs to read the new column**

Both `find_by_email` and `find_by_id` currently destructure 8 columns. Bump them to 9 and read `must_reset_password as INTEGER`:

```rust
async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError> {
    let row: Option<(i64, i64, String, String, String, String, String, i64, String)> = sqlx::query_as(
        "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at FROM users WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(self.db.pool())
    .await
    .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
    Ok(row.map(
        |(id, organization_id, email, name, ph, role, status, must_reset, ca)| User {
            id,
            organization_id,
            email,
            name,
            password_hash: ph,
            role,
            status,
            must_reset_password: must_reset != 0,
            created_at: parse_dt(&ca).unwrap_or_else(|_| Utc::now()),
        },
    ))
}
```

Apply the same shape to `find_by_email`.

- [ ] **Step 2: Update INSERT in `create` to include the new column**

```rust
async fn create(&self, new_user: NewUser) -> Result<User, AuthError> {
    let result = sqlx::query(
        "INSERT INTO users (organization_id, email, name, password_hash, role, status, must_reset_password) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(new_user.organization_id)
    .bind(&new_user.email)
    .bind(&new_user.name)
    .bind(&new_user.password_hash)
    .bind(&new_user.role)
    .bind(&new_user.status)
    .bind(if new_user.must_reset_password { 1_i64 } else { 0_i64 })
    .execute(self.db.pool())
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("UNIQUE") {
            AuthError::EmailAlreadyTaken { email: new_user.email.clone() }
        } else {
            AuthError::Internal { reason: msg }
        }
    })?;
    let id = result.last_insert_rowid();
    self.find_by_id(id).await?.ok_or(AuthError::Internal {
        reason: "user not found after insert".into(),
    })
}
```

- [ ] **Step 3: Run cargo check**

Run: `cargo check`
Expected: PASS across the workspace.

- [ ] **Step 4: Run the existing users_repository test**

Run: `cargo test --test users_repository`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add crates/domain/src/auth/entities/user.rs \
        crates/infrastructure/src/persistence/repositories/users_repository.rs \
        crates/application/src/auth_cases/cases.rs \
        src/composition/app_state.rs \
        tests/auth_application.rs
git commit -m "feat(domain,infra): propagate must_reset_password through user repo"
```

---

## Task 4: Domain — audit aggregate (entities + ports + errors)

**Files:**
- Create: `crates/domain/src/audit/mod.rs`
- Create: `crates/domain/src/audit/entities/mod.rs`
- Create: `crates/domain/src/audit/entities/audit_event.rs`
- Create: `crates/domain/src/audit/outbound/mod.rs`
- Create: `crates/domain/src/audit/outbound/audit_repository.rs`
- Create: `crates/domain/src/audit/inbound/mod.rs`
- Create: `crates/domain/src/audit/inbound/audit_uses.rs`
- Modify: `crates/domain/src/mod.rs`
- Modify: `crates/domain/src/error.rs`

- [ ] **Step 1: Write `audit/mod.rs`**

```rust
pub mod entities;
pub mod inbound;
pub mod outbound;
```

- [ ] **Step 2: Write `audit/entities/mod.rs`**

```rust
pub mod audit_event;
```

- [ ] **Step 3: Write `audit/entities/audit_event.rs`**

```rust
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuditEvent {
    pub id: i64,
    pub organization_id: Option<i64>,
    pub user_id: Option<i64>,
    pub user_email: Option<String>,
    pub user_role: Option<String>,
    pub action: String,
    pub method: String,
    pub path: String,
    pub status_code: Option<i64>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct NewAuditEvent {
    pub organization_id: Option<i64>,
    pub user_id: Option<i64>,
    pub user_email: Option<String>,
    pub user_role: Option<String>,
    pub action: String,
    pub method: String,
    pub path: String,
    pub status_code: Option<i64>,
    pub ip_address: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct AuditFilter {
    pub organization_id: Option<i64>,
    pub user_id: Option<i64>,
    pub method: Option<String>,
    pub path_contains: Option<String>,
    pub status_code: Option<i64>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone)]
pub struct AuditPage {
    pub items: Vec<AuditEvent>,
    /// The id of the oldest row in this page, to be passed as the next cursor.
    pub next_cursor: Option<i64>,
}
```

- [ ] **Step 4: Write `audit/outbound/mod.rs` and `audit_repository.rs`**

`audit/outbound/mod.rs`:

```rust
pub mod audit_repository;
```

`audit/outbound/audit_repository.rs`:

```rust
use async_trait::async_trait;

use crate::audit::entities::audit_event::{AuditFilter, AuditPage, NewAuditEvent};
use crate::error::AuditError;

#[async_trait]
pub trait AuditRepository: Send + Sync {
    async fn record(&self, event: NewAuditEvent) -> Result<(), AuditError>;
    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError>;
}
```

- [ ] **Step 5: Write `audit/inbound/mod.rs` and `audit_uses.rs`**

`audit/inbound/mod.rs`:

```rust
pub mod audit_uses;
```

`audit/inbound/audit_uses.rs`:

```rust
use async_trait::async_trait;

use crate::audit::entities::audit_event::{AuditFilter, AuditPage};
use crate::error::AuditError;

#[async_trait]
pub trait AuditUseCases: Send + Sync {
    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError>;
}
```

- [ ] **Step 6: Add `AuditError` and wire into `IoTBeeError`**

In `crates/domain/src/error.rs`, add:

```rust
#[derive(Error, Debug, Clone)]
pub enum AuditError {
    #[error("audit persistence error: {reason}")]
    Persistence { reason: String },
}
```

Then extend `IoTBeeError`:

```rust
#[error("Audit error: {0}")]
AuditError(#[from] AuditError),
```

- [ ] **Step 7: Register the module in `crates/domain/src/mod.rs`**

Add `pub mod audit;` alongside the existing modules.

- [ ] **Step 8: Run cargo check**

Run: `cargo check -p domain`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add crates/domain/src/audit \
        crates/domain/src/mod.rs \
        crates/domain/src/error.rs
git commit -m "feat(domain): add audit aggregate (entities, ports, errors)"
```

---

## Task 5: Infrastructure — `SqliteAuditEventsRepository`

**Files:**
- Create: `crates/infrastructure/src/persistence/repositories/audit_events_repository.rs`
- Modify: `crates/infrastructure/src/persistence/repositories/mod.rs`
- Create: `tests/audit_events_repository.rs`

- [ ] **Step 1: Write the failing test first**

`tests/audit_events_repository.rs`:

```rust
use std::sync::Arc;

use chrono::Utc;
use domain::audit::entities::audit_event::{AuditFilter, NewAuditEvent};
use domain::audit::outbound::audit_repository::AuditRepository;
use infrastructure::persistence::connection::InternalDataBase;
use infrastructure::persistence::repositories::audit_events_repository::SqliteAuditEventsRepository;

async fn setup() -> SqliteAuditEventsRepository {
    let _ = dotenvy::dotenv();
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Arc::new(InternalDataBase::new(&url).await.unwrap());
    sqlx::migrate!("./migrations").run(db.pool()).await.unwrap();
    sqlx::query("DELETE FROM audit_events").execute(db.pool()).await.unwrap();
    SqliteAuditEventsRepository::new(db)
}

fn event(method: &str, path: &str, user: i64) -> NewAuditEvent {
    NewAuditEvent {
        organization_id: Some(1),
        user_id: Some(user),
        user_email: Some(format!("u{}@x.com", user)),
        user_role: Some("admin".into()),
        action: format!("{} {}", method, path),
        method: method.into(),
        path: path.into(),
        status_code: Some(200),
        ip_address: Some("127.0.0.1".into()),
    }
}

#[tokio::test]
async fn records_and_lists_in_desc_order() {
    let repo = setup().await;
    repo.record(event("POST", "/api/v1/data-sources", 1)).await.unwrap();
    repo.record(event("PATCH", "/api/v1/data-sources/3", 1)).await.unwrap();
    let page = repo.list(AuditFilter::default(), None, 10).await.unwrap();
    assert_eq!(page.items.len(), 2);
    assert_eq!(page.items[0].method, "PATCH"); // newest first
    assert_eq!(page.items[1].method, "POST");
}

#[tokio::test]
async fn filters_by_path_contains() {
    let repo = setup().await;
    repo.record(event("POST", "/api/v1/data-sources", 1)).await.unwrap();
    repo.record(event("POST", "/api/v1/pipelines", 1)).await.unwrap();
    let mut f = AuditFilter::default();
    f.path_contains = Some("pipelines".into());
    let page = repo.list(f, None, 10).await.unwrap();
    assert_eq!(page.items.len(), 1);
    assert_eq!(page.items[0].path, "/api/v1/pipelines");
}

#[tokio::test]
async fn paginates_with_cursor() {
    let repo = setup().await;
    for i in 0..5 {
        repo.record(event("POST", &format!("/r/{i}"), 1)).await.unwrap();
    }
    let p1 = repo.list(AuditFilter::default(), None, 2).await.unwrap();
    assert_eq!(p1.items.len(), 2);
    let cur = p1.next_cursor.expect("expected cursor");
    let p2 = repo.list(AuditFilter::default(), Some(cur), 2).await.unwrap();
    assert_eq!(p2.items.len(), 2);
    // Pages should not overlap.
    assert!(p1.items.iter().all(|a| p2.items.iter().all(|b| a.id != b.id)));
}

#[tokio::test]
async fn filters_by_date_range() {
    let repo = setup().await;
    repo.record(event("POST", "/api/v1/x", 1)).await.unwrap();
    let mut f = AuditFilter::default();
    f.from = Some(Utc::now() - chrono::Duration::minutes(1));
    let page = repo.list(f, None, 10).await.unwrap();
    assert_eq!(page.items.len(), 1);
}
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `cargo test --test audit_events_repository`
Expected: FAILS at link/compile because `SqliteAuditEventsRepository` doesn't exist yet.

- [ ] **Step 3: Write the repo implementation**

`crates/infrastructure/src/persistence/repositories/audit_events_repository.rs`:

```rust
use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};

use domain::audit::entities::audit_event::{
    AuditEvent, AuditFilter, AuditPage, NewAuditEvent,
};
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::error::AuditError;

use crate::persistence::connection::InternalDataBase;

pub struct SqliteAuditEventsRepository {
    db: Arc<InternalDataBase>,
}

impl SqliteAuditEventsRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self {
        Self { db }
    }
}

fn parse_dt(raw: &str) -> DateTime<Utc> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .map(|n| n.and_utc())
        .unwrap_or_else(|_| Utc::now())
}

#[async_trait]
impl AuditRepository for SqliteAuditEventsRepository {
    async fn record(&self, e: NewAuditEvent) -> Result<(), AuditError> {
        sqlx::query(
            "INSERT INTO audit_events
                (organization_id, user_id, user_email, user_role, action, method, path, status_code, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(e.organization_id)
        .bind(e.user_id)
        .bind(e.user_email)
        .bind(e.user_role)
        .bind(e.action)
        .bind(e.method)
        .bind(e.path)
        .bind(e.status_code)
        .bind(e.ip_address)
        .execute(self.db.pool())
        .await
        .map_err(|err| AuditError::Persistence { reason: err.to_string() })?;
        Ok(())
    }

    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError> {
        let limit = limit.clamp(1, 200);

        // Build the SQL first so the &str borrow we give to query_as lives
        // through the await. Then bind in the same order we appended clauses.
        let mut sql = String::from(
            "SELECT id, organization_id, user_id, user_email, user_role, action, method, path, \
                    status_code, ip_address, created_at \
             FROM audit_events WHERE 1=1",
        );
        if filter.organization_id.is_some() { sql.push_str(" AND organization_id = ?"); }
        if filter.user_id.is_some() { sql.push_str(" AND user_id = ?"); }
        if filter.method.is_some() { sql.push_str(" AND method = ?"); }
        if filter.path_contains.is_some() { sql.push_str(" AND path LIKE ?"); }
        if filter.status_code.is_some() { sql.push_str(" AND status_code = ?"); }
        if filter.from.is_some() { sql.push_str(" AND created_at >= ?"); }
        if filter.to.is_some() { sql.push_str(" AND created_at <= ?"); }
        if cursor.is_some() { sql.push_str(" AND id < ?"); }
        sql.push_str(" ORDER BY id DESC LIMIT ?");

        type Row = (
            i64, Option<i64>, Option<i64>, Option<String>, Option<String>,
            String, String, String, Option<i64>, Option<String>, String,
        );
        let mut q = sqlx::query_as::<_, Row>(&sql);

        if let Some(v) = filter.organization_id { q = q.bind(v); }
        if let Some(v) = filter.user_id { q = q.bind(v); }
        if let Some(v) = filter.method.clone() { q = q.bind(v); }
        if let Some(v) = filter.path_contains.clone() { q = q.bind(format!("%{}%", v)); }
        if let Some(v) = filter.status_code { q = q.bind(v); }
        if let Some(v) = filter.from { q = q.bind(v.format("%Y-%m-%d %H:%M:%S").to_string()); }
        if let Some(v) = filter.to { q = q.bind(v.format("%Y-%m-%d %H:%M:%S").to_string()); }
        if let Some(v) = cursor { q = q.bind(v); }
        q = q.bind(limit);

        let rows = q
            .fetch_all(self.db.pool())
            .await
            .map_err(|err| AuditError::Persistence { reason: err.to_string() })?;

        let items: Vec<AuditEvent> = rows
            .into_iter()
            .map(|(id, org, uid, email, role, action, method, path, status, ip, ca)| AuditEvent {
                id,
                organization_id: org,
                user_id: uid,
                user_email: email,
                user_role: role,
                action,
                method,
                path,
                status_code: status,
                ip_address: ip,
                created_at: parse_dt(&ca),
            })
            .collect();

        let next_cursor = items.last().map(|e| e.id);
        Ok(AuditPage { items, next_cursor })
    }
}
```

> Implementation note: the scaffolding/dead-code block above is intentionally left for the engineer to **delete** when copying this file — use only the section labelled "FLAT IMPLEMENTATION". `Box::leak` is acceptable here because we own the string and the leak is bounded by request lifetime; if uncomfortable, switch to a `&'static` SQL template per filter shape.

- [ ] **Step 4: Register the module**

In `crates/infrastructure/src/persistence/repositories/mod.rs`, add `pub mod audit_events_repository;`.

- [ ] **Step 5: Run the test**

Run: `DATABASE_URL=sqlite://./data/iot_bee.db cargo test --test audit_events_repository -- --test-threads=1`
Expected: all 4 tests PASS. Single-threaded because each test calls `DELETE FROM audit_events` on the shared DB.

- [ ] **Step 6: Commit**

```bash
git add crates/infrastructure/src/persistence/repositories/audit_events_repository.rs \
        crates/infrastructure/src/persistence/repositories/mod.rs \
        tests/audit_events_repository.rs
git commit -m "feat(infra): SqliteAuditEventsRepository with filtered, cursor-paged list"
```

---

## Task 6: AuditLogMw — persist events through the repository

**Files:**
- Modify: `crates/adapters/src/api/ops_middleware.rs`

- [ ] **Step 1: Change `AuditLog` to carry an `Arc<dyn AuditRepository>`**

At the top of the file:

```rust
use std::sync::Arc;
use chrono::Utc;
use domain::audit::entities::audit_event::NewAuditEvent;
use domain::audit::outbound::audit_repository::AuditRepository;
```

Replace the unit struct with one that holds the repo:

```rust
#[derive(Clone)]
pub struct AuditLog {
    repo: Arc<dyn AuditRepository>,
}

impl AuditLog {
    pub fn new(repo: Arc<dyn AuditRepository>) -> Self {
        Self { repo }
    }
}
```

- [ ] **Step 2: Thread the repo through `Transform` and `Service`**

```rust
impl<S, B> Transform<S, ServiceRequest> for AuditLog
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuditLogMw<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuditLogMw {
            service: Rc::new(service),
            repo: self.repo.clone(),
        }))
    }
}

pub struct AuditLogMw<S> {
    service: Rc<S>,
    repo: Arc<dyn AuditRepository>,
}
```

- [ ] **Step 3: In `call`, spawn the persistence call after the inner service returns**

```rust
fn call(&self, req: ServiceRequest) -> Self::Future {
    let svc = self.service.clone();
    let repo = self.repo.clone();
    let method = req.method().to_string();
    let path = req.path().to_string();
    let ip = req
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string();
    let claims = req.extensions().get::<JwtClaims>().cloned();
    Box::pin(async move {
        let res = svc.call(req).await?;
        if !matches!(method.as_str(), "GET" | "HEAD" | "OPTIONS") {
            if let Some(claims) = claims {
                AUDIT_LOGGER.info(&format!(
                    "org={} user={} role={} method={} path={} status={} ip={}",
                    claims.organization_id,
                    claims.email,
                    claims.role,
                    method,
                    path,
                    res.status().as_u16(),
                    ip
                ));
                let event = NewAuditEvent {
                    organization_id: Some(claims.organization_id),
                    user_id: Some(claims.user_id),
                    user_email: Some(claims.email.clone()),
                    user_role: Some(claims.role.clone()),
                    action: format!("{} {}", method, path),
                    method: method.clone(),
                    path: path.clone(),
                    status_code: Some(res.status().as_u16() as i64),
                    ip_address: Some(ip.clone()),
                };
                let repo = repo.clone();
                tokio::spawn(async move {
                    if let Err(e) = repo.record(event).await {
                        AUDIT_LOGGER.warn(&format!("audit persistence failed: {}", e));
                    }
                });
                let _ = Utc::now(); // silence unused-import warnings if any
            }
        }
        Ok(res)
    })
}
```

- [ ] **Step 4: Run cargo check**

Run: `cargo check`
Expected: FAILS in `src/composition/api_composition/api_composer.rs` (calls `.wrap(AuditLog)` — must change to `.wrap(AuditLog::new(audit_repo.clone()))`). Handled in Task 14.

- [ ] **Step 5: Commit (compile failure is intentional, fixed by composition task)**

Wait — do NOT commit yet. Continue to the composition wiring so the workspace compiles before committing. Mark the task as done in your todo list, then come back here once Task 14 lands and commit everything together.

---

## Task 7: Domain — system status aggregate

**Files:**
- Create: `crates/domain/src/system/mod.rs`
- Create: `crates/domain/src/system/entities/{mod.rs, system_status.rs}`
- Create: `crates/domain/src/system/outbound/{mod.rs, system_status_probe.rs}`
- Create: `crates/domain/src/system/inbound/{mod.rs, system_uses.rs}`
- Modify: `crates/domain/src/mod.rs`
- Modify: `crates/domain/src/error.rs`

- [ ] **Step 1: Write `system/mod.rs`, `entities/mod.rs`, `outbound/mod.rs`, `inbound/mod.rs`**

Each is one line:

```rust
// system/mod.rs
pub mod entities;
pub mod inbound;
pub mod outbound;

// system/entities/mod.rs
pub mod system_status;

// system/outbound/mod.rs
pub mod system_status_probe;

// system/inbound/mod.rs
pub mod system_uses;
```

- [ ] **Step 2: Write `system/entities/system_status.rs`**

```rust
use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct Dependency {
    pub name: String,
    pub ok: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RuntimeSummary {
    pub configured_pipelines: i64,
    pub live_replicas: Option<i64>,
    pub msgs_last_hour: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct BuildInfo {
    pub commit: String,
    pub build_time: String,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone)]
pub struct SystemStatus {
    pub probed_at: DateTime<Utc>,
    pub dependencies: Vec<Dependency>,
    pub runtime: RuntimeSummary,
    pub build: BuildInfo,
}
```

- [ ] **Step 3: Write `system/outbound/system_status_probe.rs`**

```rust
use async_trait::async_trait;

use crate::error::SystemError;
use crate::system::entities::system_status::SystemStatus;

#[async_trait]
pub trait SystemStatusProbe: Send + Sync {
    async fn probe(&self) -> Result<SystemStatus, SystemError>;
}
```

- [ ] **Step 4: Write `system/inbound/system_uses.rs`**

```rust
use async_trait::async_trait;

use crate::error::SystemError;
use crate::system::entities::system_status::SystemStatus;

#[async_trait]
pub trait SystemUseCases: Send + Sync {
    async fn status(&self) -> Result<SystemStatus, SystemError>;
}
```

- [ ] **Step 5: Add `SystemError` to `error.rs` and wire it into `IoTBeeError`**

```rust
#[derive(Error, Debug, Clone)]
pub enum SystemError {
    #[error("system probe failed: {reason}")]
    ProbeFailed { reason: String },
}
```

```rust
#[error("System error: {0}")]
SystemError(#[from] SystemError),
```

- [ ] **Step 6: Register `pub mod system;` in `crates/domain/src/mod.rs`**

- [ ] **Step 7: cargo check**

Run: `cargo check -p domain`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add crates/domain/src/system crates/domain/src/mod.rs crates/domain/src/error.rs
git commit -m "feat(domain): add system status aggregate"
```

---

## Task 8: Infrastructure — `SystemStatusProbeImpl`

**Files:**
- Create: `crates/infrastructure/src/system/mod.rs`
- Create: `crates/infrastructure/src/system/status_probe.rs`
- Modify: `crates/infrastructure/src/lib.rs` (or `mod.rs`)

The probe queries SQLite for the configured-pipelines count, pings RabbitMQ via a channel that we accept by reference, and reads build info from env vars set at compile time. The live-replicas number is filled in from a getter on the existing `PipelineActorSupervisorSystemBridge` if cheap; otherwise left as `None`.

- [ ] **Step 1: Identify the pipeline-count source**

The `pipelines` table is the authoritative list of configured pipelines.  Run:

```bash
grep -rn "PipelineDataRepository" crates/infrastructure/src | head
```

Use `count_all()` if it exists; if it does not, add a small method `async fn count(&self) -> Result<i64, _>` to `PipelineDataRepository` and call that. (Add the method in `crates/infrastructure/src/persistence/repositories/pipeline_data_repository.rs` and expose it; the count is a straight `SELECT COUNT(*) FROM pipelines`.)

- [ ] **Step 2: Write `crates/infrastructure/src/system/mod.rs`**

```rust
pub mod status_probe;
```

- [ ] **Step 3: Write `crates/infrastructure/src/system/status_probe.rs`**

```rust
use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use chrono::Utc;
use tokio::time::timeout;

use domain::error::SystemError;
use domain::system::entities::system_status::{
    BuildInfo, Dependency, RuntimeSummary, SystemStatus,
};
use domain::system::outbound::system_status_probe::SystemStatusProbe;

use crate::persistence::connection::InternalDataBase;

pub struct SystemStatusProbeImpl {
    db: Arc<InternalDataBase>,
    process_start: Instant,
    rabbitmq_url: Option<String>,
}

impl SystemStatusProbeImpl {
    pub fn new(
        db: Arc<InternalDataBase>,
        process_start: Instant,
        rabbitmq_url: Option<String>,
    ) -> Self {
        Self {
            db,
            process_start,
            rabbitmq_url,
        }
    }

    async fn probe_db(&self) -> Dependency {
        let start = Instant::now();
        let res = timeout(
            Duration::from_millis(300),
            sqlx::query_scalar::<_, i64>("SELECT 1").fetch_one(self.db.pool()),
        )
        .await;
        match res {
            Ok(Ok(_)) => Dependency {
                name: "sqlite".into(),
                ok: true,
                latency_ms: Some(start.elapsed().as_millis() as u64),
                error: None,
            },
            Ok(Err(e)) => Dependency {
                name: "sqlite".into(),
                ok: false,
                latency_ms: None,
                error: Some(e.to_string()),
            },
            Err(_) => Dependency {
                name: "sqlite".into(),
                ok: false,
                latency_ms: None,
                error: Some("timeout".into()),
            },
        }
    }

    async fn probe_rabbit(&self) -> Dependency {
        let Some(url) = self.rabbitmq_url.clone() else {
            return Dependency {
                name: "rabbitmq".into(),
                ok: false,
                latency_ms: None,
                error: Some("RABBITMQ_URL not configured".into()),
            };
        };
        let start = Instant::now();
        let connect = lapin::Connection::connect(&url, lapin::ConnectionProperties::default());
        match timeout(Duration::from_millis(300), connect).await {
            Ok(Ok(conn)) => {
                let _ = conn.close(0, "probe done").await;
                Dependency {
                    name: "rabbitmq".into(),
                    ok: true,
                    latency_ms: Some(start.elapsed().as_millis() as u64),
                    error: None,
                }
            }
            Ok(Err(e)) => Dependency {
                name: "rabbitmq".into(),
                ok: false,
                latency_ms: None,
                error: Some(e.to_string()),
            },
            Err(_) => Dependency {
                name: "rabbitmq".into(),
                ok: false,
                latency_ms: None,
                error: Some("timeout".into()),
            },
        }
    }

    async fn pipeline_count(&self) -> i64 {
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pipelines")
            .fetch_one(self.db.pool())
            .await
            .unwrap_or(0)
    }
}

#[async_trait]
impl SystemStatusProbe for SystemStatusProbeImpl {
    async fn probe(&self) -> Result<SystemStatus, SystemError> {
        let (db_dep, mq_dep, count) =
            tokio::join!(self.probe_db(), self.probe_rabbit(), self.pipeline_count());

        Ok(SystemStatus {
            probed_at: Utc::now(),
            dependencies: vec![db_dep, mq_dep],
            runtime: RuntimeSummary {
                configured_pipelines: count,
                live_replicas: None,
                msgs_last_hour: None,
            },
            build: BuildInfo {
                commit: option_env!("BUILD_COMMIT").unwrap_or("dev").to_string(),
                build_time: option_env!("BUILD_TIME").unwrap_or("unknown").to_string(),
                uptime_seconds: self.process_start.elapsed().as_secs(),
            },
        })
    }
}
```

- [ ] **Step 4: Register `pub mod system;` in `crates/infrastructure/src/lib.rs` (or `mod.rs`, whichever the crate uses)**

Run: `grep -E "^pub mod" crates/infrastructure/src/lib.rs crates/infrastructure/src/mod.rs 2>/dev/null` to confirm which file is the crate root, then add the line there.

- [ ] **Step 5: cargo check**

Run: `cargo check`
Expected: PASS for the infrastructure crate. The api_composer will still fail until Task 14.

- [ ] **Step 6: Commit (defer until composition lands)**

Same rationale as Task 6 — wait to commit until composition is wired and workspace builds.

---

## Task 9: Application — `AuditUseCases`, `SystemUseCases`

**Files:**
- Create: `crates/application/src/audit_cases/{mod.rs, cases.rs}`
- Create: `crates/application/src/system_cases/{mod.rs, cases.rs}`
- Modify: `crates/application/src/lib.rs`

- [ ] **Step 1: Write `audit_cases/mod.rs` and `cases.rs`**

`audit_cases/mod.rs`:

```rust
pub mod cases;
```

`audit_cases/cases.rs`:

```rust
use std::sync::Arc;

use async_trait::async_trait;

use domain::audit::entities::audit_event::{AuditFilter, AuditPage};
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::error::AuditError;

pub struct AuditUseCasesImpl {
    repo: Arc<dyn AuditRepository>,
}

impl AuditUseCasesImpl {
    pub fn new(repo: Arc<dyn AuditRepository>) -> Self {
        Self { repo }
    }
}

#[async_trait]
impl AuditUseCases for AuditUseCasesImpl {
    async fn list(
        &self,
        filter: AuditFilter,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<AuditPage, AuditError> {
        self.repo.list(filter, cursor, limit).await
    }
}
```

- [ ] **Step 2: Write `system_cases/mod.rs` and `cases.rs`**

`system_cases/cases.rs`:

```rust
use std::sync::Arc;

use async_trait::async_trait;

use domain::error::SystemError;
use domain::system::entities::system_status::SystemStatus;
use domain::system::inbound::system_uses::SystemUseCases;
use domain::system::outbound::system_status_probe::SystemStatusProbe;

pub struct SystemUseCasesImpl {
    probe: Arc<dyn SystemStatusProbe>,
}

impl SystemUseCasesImpl {
    pub fn new(probe: Arc<dyn SystemStatusProbe>) -> Self {
        Self { probe }
    }
}

#[async_trait]
impl SystemUseCases for SystemUseCasesImpl {
    async fn status(&self) -> Result<SystemStatus, SystemError> {
        self.probe.probe().await
    }
}
```

- [ ] **Step 3: Register both new modules in `crates/application/src/lib.rs`**

Find the existing `pub mod` declarations and add:

```rust
pub mod audit_cases;
pub mod system_cases;
```

- [ ] **Step 4: cargo check**

Run: `cargo check -p application`
Expected: PASS.

- [ ] **Step 5: Commit (deferred — see Task 6)**

---

## Task 10: Domain + Application + Infrastructure — user admin extensions

**Files:**
- Modify: `crates/domain/src/auth/outbound/user_repository.rs`
- Create: `crates/domain/src/auth/inbound/user_admin_uses.rs`
- Modify: `crates/domain/src/auth/inbound/mod.rs`
- Modify: `crates/domain/src/error.rs` (add `UserAdminError`)
- Create: `crates/application/src/user_admin_cases/{mod.rs, cases.rs}`
- Modify: `crates/application/src/lib.rs`
- Modify: `crates/infrastructure/src/persistence/repositories/users_repository.rs`
- Create: `tests/user_admin_application.rs`

- [ ] **Step 1: Add `UserAdminError`**

In `crates/domain/src/error.rs`:

```rust
#[derive(Error, Debug, Clone)]
pub enum UserAdminError {
    #[error("invalid role: '{role}' (allowed: admin, operator)")]
    InvalidRole { role: String },
    #[error("invalid status: '{status}' (allowed: active, disabled)")]
    InvalidStatus { status: String },
    #[error("user not found: {id}")]
    NotFound { id: i64 },
    #[error("you cannot deactivate yourself")]
    CannotDeactivateSelf,
    #[error("email already taken: {email}")]
    EmailTaken { email: String },
    #[error("weak password: {reason}")]
    WeakPassword { reason: String },
    #[error("internal user admin error: {reason}")]
    Internal { reason: String },
}
```

Wire into `IoTBeeError`:

```rust
#[error("User admin error: {0}")]
UserAdminError(#[from] UserAdminError),
```

- [ ] **Step 2: Extend `UserRepository` port with admin methods**

`crates/domain/src/auth/outbound/user_repository.rs` — add to the trait:

```rust
async fn list_by_org(&self, organization_id: i64) -> Result<Vec<User>, AuthError>;
async fn update_role(&self, id: i64, role: &str) -> Result<(), AuthError>;
async fn set_status(&self, id: i64, status: &str) -> Result<(), AuthError>;
async fn update_name(&self, id: i64, name: &str) -> Result<(), AuthError>;
async fn create_as_admin(&self, new_user: NewUser) -> Result<User, AuthError>;
```

`create_as_admin` is distinct from `create` only at the application boundary — at the repository layer it can be the same insert; we add it as a method to keep call-sites readable. Default implementation: just delegate to `create`. So implement it inline in the impl with `self.create(new_user).await`.

- [ ] **Step 3: Update the in-memory fake in `tests/auth_application.rs`**

`InMemRepo` must implement the new methods (no-ops or simple in-memory versions; existing tests don't exercise them so trivial bodies are fine):

```rust
async fn list_by_org(&self, organization_id: i64) -> Result<Vec<User>, AuthError> {
    Ok(self.users.lock().unwrap().iter()
        .filter(|u| u.organization_id == organization_id)
        .cloned().collect())
}
async fn update_role(&self, id: i64, role: &str) -> Result<(), AuthError> {
    if let Some(u) = self.users.lock().unwrap().iter_mut().find(|u| u.id == id) { u.role = role.into(); }
    Ok(())
}
async fn set_status(&self, id: i64, status: &str) -> Result<(), AuthError> {
    if let Some(u) = self.users.lock().unwrap().iter_mut().find(|u| u.id == id) { u.status = status.into(); }
    Ok(())
}
async fn update_name(&self, id: i64, name: &str) -> Result<(), AuthError> {
    if let Some(u) = self.users.lock().unwrap().iter_mut().find(|u| u.id == id) { u.name = name.into(); }
    Ok(())
}
async fn create_as_admin(&self, new_user: NewUser) -> Result<User, AuthError> {
    self.create(new_user).await
}
```

- [ ] **Step 4: Extend `SqliteUserRepository`**

Add to the impl in `crates/infrastructure/src/persistence/repositories/users_repository.rs`:

```rust
async fn list_by_org(&self, organization_id: i64) -> Result<Vec<User>, AuthError> {
    let rows: Vec<(i64, i64, String, String, String, String, String, i64, String)> = sqlx::query_as(
        "SELECT id, organization_id, email, name, password_hash, role, status, must_reset_password, created_at
         FROM users WHERE organization_id = ? ORDER BY id DESC",
    )
    .bind(organization_id)
    .fetch_all(self.db.pool())
    .await
    .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
    Ok(rows.into_iter().map(|(id, org, email, name, ph, role, status, mr, ca)| User {
        id, organization_id: org, email, name, password_hash: ph,
        role, status, must_reset_password: mr != 0,
        created_at: parse_dt(&ca).unwrap_or_else(|_| Utc::now()),
    }).collect())
}

async fn update_role(&self, id: i64, role: &str) -> Result<(), AuthError> {
    sqlx::query("UPDATE users SET role = ? WHERE id = ?")
        .bind(role).bind(id)
        .execute(self.db.pool()).await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
    Ok(())
}

async fn set_status(&self, id: i64, status: &str) -> Result<(), AuthError> {
    sqlx::query("UPDATE users SET status = ? WHERE id = ?")
        .bind(status).bind(id)
        .execute(self.db.pool()).await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
    Ok(())
}

async fn update_name(&self, id: i64, name: &str) -> Result<(), AuthError> {
    sqlx::query("UPDATE users SET name = ? WHERE id = ?")
        .bind(name).bind(id)
        .execute(self.db.pool()).await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
    Ok(())
}

async fn create_as_admin(&self, new_user: NewUser) -> Result<User, AuthError> {
    self.create(new_user).await
}
```

- [ ] **Step 5: Define the application port `UserAdminUseCases`**

`crates/domain/src/auth/inbound/user_admin_uses.rs`:

```rust
use async_trait::async_trait;

use crate::auth::entities::user::User;
use crate::error::UserAdminError;

#[derive(Debug, Clone)]
pub struct CreateUserAsAdminInput {
    pub organization_id: i64,
    pub email: String,
    pub name: String,
    pub role: String,
    pub temp_password: String,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateUserInput {
    pub name: Option<String>,
    pub role: Option<String>,
    pub status: Option<String>,
}

#[async_trait]
pub trait UserAdminUseCases: Send + Sync {
    async fn list(&self, organization_id: i64) -> Result<Vec<User>, UserAdminError>;
    async fn create(&self, input: CreateUserAsAdminInput) -> Result<User, UserAdminError>;
    async fn update(&self, id: i64, input: UpdateUserInput) -> Result<User, UserAdminError>;
    async fn deactivate(&self, caller_id: i64, target_id: i64) -> Result<(), UserAdminError>;
}
```

Then `crates/domain/src/auth/inbound/mod.rs` gets `pub mod user_admin_uses;` added next to the existing `pub mod auth_uses;`.

- [ ] **Step 6: Write the failing application tests**

`tests/user_admin_application.rs`:

```rust
use std::sync::Mutex;

use async_trait::async_trait;
use chrono::Utc;

use application::user_admin_cases::cases::UserAdminUseCasesImpl;
use domain::auth::entities::user::{NewUser, User};
use domain::auth::inbound::user_admin_uses::{
    CreateUserAsAdminInput, UpdateUserInput, UserAdminUseCases,
};
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::user_repository::UserRepository;
use domain::error::{AuthError, UserAdminError};
use std::sync::Arc;

#[derive(Default)]
struct InMemRepo { users: Mutex<Vec<User>>, next_id: Mutex<i64> }

// (Implement the trait with the same bodies as in tests/auth_application.rs,
// plus the new admin methods. Copy/adapt from Task 10 step 3.)
// ...

struct StubHasher;
impl PasswordHasher for StubHasher {
    fn hash(&self, p: &str) -> Result<String, AuthError> { Ok(format!("h:{p}")) }
    fn verify(&self, p: &str, h: &str) -> Result<bool, AuthError> { Ok(h == format!("h:{p}")) }
}

fn make() -> UserAdminUseCasesImpl {
    UserAdminUseCasesImpl::new(Arc::new(InMemRepo::default()), Arc::new(StubHasher))
}

async fn seed(uc: &UserAdminUseCasesImpl) -> i64 {
    let u = uc.create(CreateUserAsAdminInput {
        organization_id: 1,
        email: "a@b.com".into(),
        name: "Ana".into(),
        role: "operator".into(),
        temp_password: "secret123".into(),
    }).await.unwrap();
    u.id
}

#[tokio::test]
async fn create_user_with_invalid_role_rejected() {
    let uc = make();
    let err = uc.create(CreateUserAsAdminInput {
        organization_id: 1,
        email: "x@y.com".into(),
        name: "X".into(),
        role: "wizard".into(),
        temp_password: "secret123".into(),
    }).await.unwrap_err();
    assert!(matches!(err, UserAdminError::InvalidRole { .. }));
}

#[tokio::test]
async fn weak_temp_password_rejected() {
    let uc = make();
    let err = uc.create(CreateUserAsAdminInput {
        organization_id: 1, email: "x@y.com".into(), name: "X".into(),
        role: "operator".into(), temp_password: "abc".into(),
    }).await.unwrap_err();
    assert!(matches!(err, UserAdminError::WeakPassword { .. }));
}

#[tokio::test]
async fn admin_cannot_deactivate_self() {
    let uc = make();
    let id = seed(&uc).await;
    let err = uc.deactivate(id, id).await.unwrap_err();
    assert!(matches!(err, UserAdminError::CannotDeactivateSelf));
}

#[tokio::test]
async fn deactivate_sets_status_disabled() {
    let uc = make();
    let id = seed(&uc).await;
    uc.deactivate(999, id).await.unwrap();
    let list = uc.list(1).await.unwrap();
    let target = list.iter().find(|u| u.id == id).unwrap();
    assert_eq!(target.status, "disabled");
}

#[tokio::test]
async fn update_validates_role() {
    let uc = make();
    let id = seed(&uc).await;
    let err = uc.update(id, UpdateUserInput { role: Some("ghost".into()), ..Default::default() })
        .await.unwrap_err();
    assert!(matches!(err, UserAdminError::InvalidRole { .. }));
}
```

The `InMemRepo` is the same shape used by `tests/auth_application.rs` — copy and extend. Add `futures = "0.3"` to `[dev-dependencies]` of the workspace root if `block_on` isn't available; alternatively switch `seed` to async-aware helper.

- [ ] **Step 7: Run tests; expect failure (no `UserAdminUseCasesImpl` yet)**

Run: `cargo test --test user_admin_application`
Expected: FAILS — `UserAdminUseCasesImpl` not found.

- [ ] **Step 8: Write `crates/application/src/user_admin_cases/mod.rs` and `cases.rs`**

`mod.rs`:

```rust
pub mod cases;
```

`cases.rs`:

```rust
use std::sync::Arc;

use async_trait::async_trait;

use domain::auth::entities::user::{NewUser, User};
use domain::auth::inbound::user_admin_uses::{
    CreateUserAsAdminInput, UpdateUserInput, UserAdminUseCases,
};
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::user_repository::UserRepository;
use domain::auth::value_objects::email::Email;
use domain::error::{AuthError, UserAdminError};

const ALLOWED_ROLES: &[&str] = &["admin", "operator"];
const ALLOWED_STATUSES: &[&str] = &["active", "disabled"];

pub struct UserAdminUseCasesImpl {
    repo: Arc<dyn UserRepository>,
    hasher: Arc<dyn PasswordHasher>,
}

impl UserAdminUseCasesImpl {
    pub fn new(repo: Arc<dyn UserRepository>, hasher: Arc<dyn PasswordHasher>) -> Self {
        Self { repo, hasher }
    }

    fn check_role(role: &str) -> Result<(), UserAdminError> {
        if ALLOWED_ROLES.contains(&role) { Ok(()) }
        else { Err(UserAdminError::InvalidRole { role: role.into() }) }
    }

    fn check_status(status: &str) -> Result<(), UserAdminError> {
        if ALLOWED_STATUSES.contains(&status) { Ok(()) }
        else { Err(UserAdminError::InvalidStatus { status: status.into() }) }
    }

    fn check_password(p: &str) -> Result<(), UserAdminError> {
        if p.len() < 8 {
            return Err(UserAdminError::WeakPassword { reason: "must be at least 8 characters".into() });
        }
        Ok(())
    }
}

fn map_auth_err(e: AuthError, fallback_email: Option<&str>) -> UserAdminError {
    match e {
        AuthError::EmailAlreadyTaken { email } => UserAdminError::EmailTaken { email },
        AuthError::Internal { reason } => UserAdminError::Internal { reason },
        other => UserAdminError::Internal { reason: format!("{}", other) },
    }
}

#[async_trait]
impl UserAdminUseCases for UserAdminUseCasesImpl {
    async fn list(&self, organization_id: i64) -> Result<Vec<User>, UserAdminError> {
        self.repo.list_by_org(organization_id).await
            .map_err(|e| map_auth_err(e, None))
    }

    async fn create(&self, input: CreateUserAsAdminInput) -> Result<User, UserAdminError> {
        Self::check_role(&input.role)?;
        Self::check_password(&input.temp_password)?;
        let email = Email::parse(input.email.clone())
            .map_err(|_| UserAdminError::Internal { reason: "invalid email".into() })?
            .into_string();
        if self.repo.find_by_email(&email).await
            .map_err(|e| map_auth_err(e, Some(&email)))?
            .is_some()
        {
            return Err(UserAdminError::EmailTaken { email });
        }
        let password_hash = self.hasher.hash(&input.temp_password)
            .map_err(|e| UserAdminError::Internal { reason: format!("{}", e) })?;
        self.repo.create_as_admin(NewUser {
            organization_id: input.organization_id,
            email,
            name: input.name,
            password_hash,
            role: input.role,
            status: "active".into(),
            must_reset_password: true,
        }).await.map_err(|e| map_auth_err(e, None))
    }

    async fn update(&self, id: i64, input: UpdateUserInput) -> Result<User, UserAdminError> {
        if let Some(role) = input.role.as_deref() {
            Self::check_role(role)?;
            self.repo.update_role(id, role).await.map_err(|e| map_auth_err(e, None))?;
        }
        if let Some(status) = input.status.as_deref() {
            Self::check_status(status)?;
            self.repo.set_status(id, status).await.map_err(|e| map_auth_err(e, None))?;
        }
        if let Some(name) = input.name.as_deref() {
            self.repo.update_name(id, name).await.map_err(|e| map_auth_err(e, None))?;
        }
        let user = self.repo.find_by_id(id).await
            .map_err(|e| map_auth_err(e, None))?
            .ok_or(UserAdminError::NotFound { id })?;
        Ok(user)
    }

    async fn deactivate(&self, caller_id: i64, target_id: i64) -> Result<(), UserAdminError> {
        if caller_id == target_id {
            return Err(UserAdminError::CannotDeactivateSelf);
        }
        let _ = self.repo.find_by_id(target_id).await
            .map_err(|e| map_auth_err(e, None))?
            .ok_or(UserAdminError::NotFound { id: target_id })?;
        self.repo.set_status(target_id, "disabled").await
            .map_err(|e| map_auth_err(e, None))
    }
}
```

- [ ] **Step 9: Register `pub mod user_admin_cases;` in `crates/application/src/lib.rs`**

- [ ] **Step 10: Run the tests again**

Run: `cargo test --test user_admin_application`
Expected: 5 tests PASS.

- [ ] **Step 11: Commit (deferred)**

Wait until composition lands; see Task 14.

---

## Task 11: Domain + Application + Infrastructure — organization aggregate

**Files:**
- Create: `crates/domain/src/organization/{mod.rs, entities/mod.rs, entities/organization.rs, outbound/mod.rs, outbound/organization_repository.rs, inbound/mod.rs, inbound/organization_uses.rs}`
- Modify: `crates/domain/src/mod.rs`
- Modify: `crates/domain/src/error.rs`
- Create: `crates/application/src/organization_cases/{mod.rs, cases.rs}`
- Modify: `crates/application/src/lib.rs`
- Create: `crates/infrastructure/src/persistence/repositories/organizations_repository.rs`
- Modify: `crates/infrastructure/src/persistence/repositories/mod.rs`

- [ ] **Step 1: Write `domain/organization/entities/organization.rs`**

```rust
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Organization {
    pub id: i64,
    pub name: String,
    pub slug: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateOrganization {
    pub name: Option<String>,
    pub slug: Option<String>,
}
```

- [ ] **Step 2: Write `outbound/organization_repository.rs`**

```rust
use async_trait::async_trait;

use crate::error::OrganizationError;
use crate::organization::entities::organization::{Organization, UpdateOrganization};

#[async_trait]
pub trait OrganizationRepository: Send + Sync {
    async fn find_by_id(&self, id: i64) -> Result<Option<Organization>, OrganizationError>;
    async fn update(&self, id: i64, patch: UpdateOrganization) -> Result<Organization, OrganizationError>;
}
```

- [ ] **Step 3: Write `inbound/organization_uses.rs`**

```rust
use async_trait::async_trait;

use crate::error::OrganizationError;
use crate::organization::entities::organization::{Organization, UpdateOrganization};

#[async_trait]
pub trait OrganizationUseCases: Send + Sync {
    async fn read(&self, id: i64) -> Result<Organization, OrganizationError>;
    async fn update(&self, id: i64, patch: UpdateOrganization) -> Result<Organization, OrganizationError>;
}
```

- [ ] **Step 4: Add `OrganizationError`**

```rust
#[derive(Error, Debug, Clone)]
pub enum OrganizationError {
    #[error("organization not found: {id}")]
    NotFound { id: i64 },
    #[error("slug '{slug}' already taken")]
    SlugTaken { slug: String },
    #[error("invalid slug: {reason}")]
    InvalidSlug { reason: String },
    #[error("internal organization error: {reason}")]
    Internal { reason: String },
}
```

Wire `#[error("Organization error: {0}")] OrganizationError(#[from] OrganizationError)` into `IoTBeeError`.

- [ ] **Step 5: Register `pub mod organization;` in `crates/domain/src/mod.rs`**

- [ ] **Step 6: Write the application use case**

`crates/application/src/organization_cases/cases.rs`:

```rust
use std::sync::Arc;

use async_trait::async_trait;
use regex::Regex;
use once_cell::sync::Lazy;

use domain::error::OrganizationError;
use domain::organization::entities::organization::{Organization, UpdateOrganization};
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::organization::outbound::organization_repository::OrganizationRepository;

static SLUG_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-z0-9-]{1,64}$").unwrap());

pub struct OrganizationUseCasesImpl {
    repo: Arc<dyn OrganizationRepository>,
}

impl OrganizationUseCasesImpl {
    pub fn new(repo: Arc<dyn OrganizationRepository>) -> Self { Self { repo } }
}

#[async_trait]
impl OrganizationUseCases for OrganizationUseCasesImpl {
    async fn read(&self, id: i64) -> Result<Organization, OrganizationError> {
        self.repo.find_by_id(id).await?.ok_or(OrganizationError::NotFound { id })
    }

    async fn update(&self, id: i64, patch: UpdateOrganization) -> Result<Organization, OrganizationError> {
        if let Some(ref slug) = patch.slug {
            if !SLUG_RE.is_match(slug) {
                return Err(OrganizationError::InvalidSlug {
                    reason: "must match ^[a-z0-9-]{1,64}$".into(),
                });
            }
        }
        self.repo.update(id, patch).await
    }
}
```

Add `regex` and `once_cell` to the `application` crate's `Cargo.toml` `[dependencies]` if missing (`regex = "1"`, `once_cell = "1"`).

- [ ] **Step 7: Write `crates/infrastructure/src/persistence/repositories/organizations_repository.rs`**

```rust
use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};

use domain::error::OrganizationError;
use domain::organization::entities::organization::{Organization, UpdateOrganization};
use domain::organization::outbound::organization_repository::OrganizationRepository;

use crate::persistence::connection::InternalDataBase;

pub struct SqliteOrganizationsRepository {
    db: Arc<InternalDataBase>,
}

impl SqliteOrganizationsRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self { Self { db } }
}

fn parse_dt(raw: &str) -> DateTime<Utc> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .map(|n| n.and_utc()).unwrap_or_else(|_| Utc::now())
}

#[async_trait]
impl OrganizationRepository for SqliteOrganizationsRepository {
    async fn find_by_id(&self, id: i64) -> Result<Option<Organization>, OrganizationError> {
        let row: Option<(i64, String, String, String, String)> = sqlx::query_as(
            "SELECT id, name, slug, created_at, updated_at FROM organizations WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| OrganizationError::Internal { reason: e.to_string() })?;
        Ok(row.map(|(id, name, slug, ca, ua)| Organization {
            id, name, slug,
            created_at: parse_dt(&ca),
            updated_at: parse_dt(&ua),
        }))
    }

    async fn update(&self, id: i64, patch: UpdateOrganization) -> Result<Organization, OrganizationError> {
        let current = self.find_by_id(id).await?
            .ok_or(OrganizationError::NotFound { id })?;
        let new_name = patch.name.unwrap_or(current.name);
        let new_slug = patch.slug.unwrap_or(current.slug);

        let res = sqlx::query(
            "UPDATE organizations SET name = ?, slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(&new_name).bind(&new_slug).bind(id)
        .execute(self.db.pool())
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("UNIQUE") {
                OrganizationError::SlugTaken { slug: new_slug.clone() }
            } else {
                OrganizationError::Internal { reason: msg }
            }
        })?;

        if res.rows_affected() == 0 {
            return Err(OrganizationError::NotFound { id });
        }
        self.find_by_id(id).await?
            .ok_or(OrganizationError::Internal { reason: "missing after update".into() })
    }
}
```

- [ ] **Step 8: Register modules and run check**

Add `pub mod organization_cases;` to `crates/application/src/lib.rs`.
Add `pub mod organizations_repository;` to `crates/infrastructure/src/persistence/repositories/mod.rs`.

Run: `cargo check`
Expected: PASS (api_composer still failing per Task 6/8/9 — fixed in Task 14).

- [ ] **Step 9: Commit (deferred)**

---

## Task 12: Adapter — admin API surface (audit, system, users, organization)

**Files:**
- Create: `crates/adapters/src/api/admin/mod.rs`
- Create: `crates/adapters/src/api/admin/{audit,system,users,organization}/{mod.rs, handlers.rs, models.rs, routers.rs}`
- Create: `crates/adapters/src/api/admin/routers.rs`
- Modify: `crates/adapters/src/api/mod.rs` — add `pub mod admin;`

Each sub-module follows the existing auth/data_sources pattern. Below: the full content of each file. Copy verbatim.

### 12.1 `admin/mod.rs`

- [ ] **Step 1: Create `crates/adapters/src/api/admin/mod.rs`**

```rust
pub mod audit;
pub mod organization;
pub mod routers;
pub mod system;
pub mod users;
```

### 12.2 Audit sub-module

- [ ] **Step 2: `admin/audit/mod.rs`**

```rust
pub mod handlers;
pub mod models;
pub mod routers;
```

- [ ] **Step 3: `admin/audit/models.rs`**

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Deserialize, IntoParams)]
pub struct AuditListQuery {
    pub user_id: Option<i64>,
    pub method: Option<String>,
    pub path_contains: Option<String>,
    pub status: Option<i64>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub cursor: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize, ToSchema)]
pub struct AuditEventResponse {
    pub id: i64,
    #[serde(rename = "organizationId")] pub organization_id: Option<i64>,
    #[serde(rename = "userId")]         pub user_id: Option<i64>,
    #[serde(rename = "userEmail")]      pub user_email: Option<String>,
    #[serde(rename = "userRole")]       pub user_role: Option<String>,
    pub action: String,
    pub method: String,
    pub path: String,
    #[serde(rename = "statusCode")]     pub status_code: Option<i64>,
    #[serde(rename = "ipAddress")]      pub ip_address: Option<String>,
    #[serde(rename = "createdAt")]      pub created_at: String,
}

#[derive(Serialize, ToSchema)]
pub struct AuditListResponse {
    pub items: Vec<AuditEventResponse>,
    #[serde(rename = "nextCursor")] pub next_cursor: Option<i64>,
}
```

- [ ] **Step 4: `admin/audit/handlers.rs`**

```rust
use actix_web::{HttpRequest, HttpResponse, get, web};

use domain::audit::entities::audit_event::AuditFilter;
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::IoTBeeError;

use super::models::{AuditEventResponse, AuditListQuery, AuditListResponse};
use crate::api::error::{ApiError, ErrorResponse};
use actix_web::HttpMessage;

type UseCase = dyn AuditUseCases + Send + Sync;

#[utoipa::path(
    get, path = "/admin/audit",
    params(AuditListQuery),
    responses(
        (status = 200, description = "Audit events", body = AuditListResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("")]
pub async fn list(
    req: HttpRequest,
    q: web::Query<AuditListQuery>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let claims = req.extensions().get::<JwtClaims>().cloned()
        .ok_or_else(|| ApiError(IoTBeeError::AuthError(domain::error::AuthError::InvalidToken)))?;

    let mut filter = AuditFilter::default();
    filter.organization_id = Some(claims.organization_id);
    filter.user_id = q.user_id;
    filter.method = q.method.clone();
    filter.path_contains = q.path_contains.clone();
    filter.status_code = q.status;
    filter.from = q.from;
    filter.to = q.to;

    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    let page = uc.list(filter, q.cursor, limit).await
        .map_err(|e| ApiError(IoTBeeError::AuditError(e)))?;

    let resp = AuditListResponse {
        items: page.items.into_iter().map(|e| AuditEventResponse {
            id: e.id,
            organization_id: e.organization_id,
            user_id: e.user_id,
            user_email: e.user_email,
            user_role: e.user_role,
            action: e.action,
            method: e.method,
            path: e.path,
            status_code: e.status_code,
            ip_address: e.ip_address,
            created_at: e.created_at.to_rfc3339(),
        }).collect(),
        next_cursor: page.next_cursor,
    };
    Ok(HttpResponse::Ok().json(resp))
}
```

- [ ] **Step 5: `admin/audit/routers.rs`**

```rust
use actix_web::{Scope, web};

use domain::audit::inbound::audit_uses::AuditUseCases;

use super::handlers;

pub fn audit_scope(uc: web::Data<dyn AuditUseCases + Send + Sync>) -> Scope {
    web::scope("/audit").app_data(uc).service(handlers::list)
}
```

### 12.3 System sub-module

- [ ] **Step 6: `admin/system/{mod.rs, models.rs, handlers.rs, routers.rs}`**

`mod.rs`:

```rust
pub mod handlers;
pub mod models;
pub mod routers;
```

`models.rs`:

```rust
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct DependencyResponse {
    pub name: String,
    pub ok: bool,
    #[serde(rename = "latencyMs")] pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct RuntimeResponse {
    #[serde(rename = "configuredPipelines")] pub configured_pipelines: i64,
    #[serde(rename = "liveReplicas")]         pub live_replicas: Option<i64>,
    #[serde(rename = "msgsLastHour")]         pub msgs_last_hour: Option<i64>,
}

#[derive(Serialize, ToSchema)]
pub struct BuildResponse {
    pub commit: String,
    #[serde(rename = "buildTime")]      pub build_time: String,
    #[serde(rename = "uptimeSeconds")]  pub uptime_seconds: u64,
}

#[derive(Serialize, ToSchema)]
pub struct SystemStatusResponse {
    #[serde(rename = "probedAt")]   pub probed_at: String,
    pub dependencies: Vec<DependencyResponse>,
    pub runtime: RuntimeResponse,
    pub build: BuildResponse,
}
```

`handlers.rs`:

```rust
use actix_web::{HttpResponse, get, web};

use domain::error::IoTBeeError;
use domain::system::inbound::system_uses::SystemUseCases;

use super::models::{
    BuildResponse, DependencyResponse, RuntimeResponse, SystemStatusResponse,
};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn SystemUseCases + Send + Sync;

#[utoipa::path(
    get, path = "/admin/system/status",
    responses(
        (status = 200, description = "System status", body = SystemStatusResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("/status")]
pub async fn status(uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let s = uc.status().await.map_err(|e| ApiError(IoTBeeError::SystemError(e)))?;
    let resp = SystemStatusResponse {
        probed_at: s.probed_at.to_rfc3339(),
        dependencies: s.dependencies.into_iter().map(|d| DependencyResponse {
            name: d.name, ok: d.ok, latency_ms: d.latency_ms, error: d.error,
        }).collect(),
        runtime: RuntimeResponse {
            configured_pipelines: s.runtime.configured_pipelines,
            live_replicas: s.runtime.live_replicas,
            msgs_last_hour: s.runtime.msgs_last_hour,
        },
        build: BuildResponse {
            commit: s.build.commit,
            build_time: s.build.build_time,
            uptime_seconds: s.build.uptime_seconds,
        },
    };
    Ok(HttpResponse::Ok().json(resp))
}
```

`routers.rs`:

```rust
use actix_web::{Scope, web};

use domain::system::inbound::system_uses::SystemUseCases;

use super::handlers;

pub fn system_scope(uc: web::Data<dyn SystemUseCases + Send + Sync>) -> Scope {
    web::scope("/system").app_data(uc).service(handlers::status)
}
```

### 12.4 Users sub-module

- [ ] **Step 7: `admin/users/{mod.rs, models.rs, handlers.rs, routers.rs}`**

`mod.rs`:

```rust
pub mod handlers;
pub mod models;
pub mod routers;
```

`models.rs`:

```rust
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: String,
    pub role: String,
    #[serde(rename = "tempPassword")] pub temp_password: String,
}

#[derive(Deserialize, ToSchema, Default)]
pub struct PatchUserRequest {
    pub name: Option<String>,
    pub role: Option<String>,
    pub status: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct AdminUserResponse {
    pub id: i64,
    #[serde(rename = "organizationId")] pub organization_id: i64,
    pub email: String,
    pub name: String,
    pub role: String,
    pub status: String,
    #[serde(rename = "mustResetPassword")] pub must_reset_password: bool,
    #[serde(rename = "createdAt")] pub created_at: String,
}

#[derive(Serialize, ToSchema)]
pub struct AdminUsersListResponse {
    pub items: Vec<AdminUserResponse>,
}
```

`handlers.rs`:

```rust
use actix_web::{HttpMessage, HttpRequest, HttpResponse, delete, get, patch, post, web};

use domain::auth::entities::user::User;
use domain::auth::inbound::user_admin_uses::{
    CreateUserAsAdminInput, UpdateUserInput, UserAdminUseCases,
};
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::IoTBeeError;

use super::models::{
    AdminUserResponse, AdminUsersListResponse, CreateUserRequest, PatchUserRequest,
};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn UserAdminUseCases + Send + Sync;

fn to_resp(u: &User) -> AdminUserResponse {
    AdminUserResponse {
        id: u.id,
        organization_id: u.organization_id,
        email: u.email.clone(),
        name: u.name.clone(),
        role: u.role.clone(),
        status: u.status.clone(),
        must_reset_password: u.must_reset_password,
        created_at: u.created_at.to_rfc3339(),
    }
}

fn claims(req: &HttpRequest) -> Result<JwtClaims, ApiError> {
    req.extensions().get::<JwtClaims>().cloned().ok_or_else(|| {
        ApiError(IoTBeeError::AuthError(domain::error::AuthError::InvalidToken))
    })
}

#[utoipa::path(
    get, path = "/admin/users",
    responses(
        (status = 200, description = "List", body = AdminUsersListResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("")]
pub async fn list(req: HttpRequest, uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let users = uc.list(c.organization_id).await
        .map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;
    Ok(HttpResponse::Ok().json(AdminUsersListResponse {
        items: users.iter().map(to_resp).collect(),
    }))
}

#[utoipa::path(
    post, path = "/admin/users",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "Created", body = AdminUserResponse),
        (status = 400, description = "Invalid", body = ErrorResponse),
        (status = 409, description = "Email taken", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[post("")]
pub async fn create(
    req: HttpRequest,
    body: web::Json<CreateUserRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let body = body.into_inner();
    let u = uc.create(CreateUserAsAdminInput {
        organization_id: c.organization_id,
        email: body.email,
        name: body.name,
        role: body.role,
        temp_password: body.temp_password,
    }).await.map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;
    Ok(HttpResponse::Created().json(to_resp(&u)))
}

#[utoipa::path(
    patch, path = "/admin/users/{id}",
    request_body = PatchUserRequest,
    responses(
        (status = 200, description = "Updated", body = AdminUserResponse),
        (status = 400, description = "Invalid", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[patch("/{id}")]
pub async fn patch_user(
    path: web::Path<i64>,
    body: web::Json<PatchUserRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let id = path.into_inner();
    let body = body.into_inner();
    let u = uc.update(id, UpdateUserInput {
        name: body.name, role: body.role, status: body.status,
    }).await.map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;
    Ok(HttpResponse::Ok().json(to_resp(&u)))
}

#[utoipa::path(
    delete, path = "/admin/users/{id}",
    responses(
        (status = 204, description = "Deactivated"),
        (status = 400, description = "Cannot deactivate self", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[delete("/{id}")]
pub async fn deactivate(
    req: HttpRequest,
    path: web::Path<i64>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let target = path.into_inner();
    uc.deactivate(c.user_id, target).await
        .map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;
    Ok(HttpResponse::NoContent().finish())
}
```

`routers.rs`:

```rust
use actix_web::{Scope, web};

use domain::auth::inbound::user_admin_uses::UserAdminUseCases;

use super::handlers;

pub fn users_scope(uc: web::Data<dyn UserAdminUseCases + Send + Sync>) -> Scope {
    web::scope("/users")
        .app_data(uc)
        .service(handlers::list)
        .service(handlers::create)
        .service(handlers::patch_user)
        .service(handlers::deactivate)
}
```

### 12.5 Organization sub-module

- [ ] **Step 8: `admin/organization/{mod.rs, models.rs, handlers.rs, routers.rs}`**

`mod.rs`:

```rust
pub mod handlers;
pub mod models;
pub mod routers;
```

`models.rs`:

```rust
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema, Default)]
pub struct PatchOrganizationRequest {
    pub name: Option<String>,
    pub slug: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct OrganizationResponse {
    pub id: i64,
    pub name: String,
    pub slug: String,
    #[serde(rename = "createdAt")] pub created_at: String,
    #[serde(rename = "updatedAt")] pub updated_at: String,
}
```

`handlers.rs`:

```rust
use actix_web::{HttpMessage, HttpRequest, HttpResponse, get, patch, web};

use domain::auth::value_objects::claims::JwtClaims;
use domain::error::IoTBeeError;
use domain::organization::entities::organization::{Organization, UpdateOrganization};
use domain::organization::inbound::organization_uses::OrganizationUseCases;

use super::models::{OrganizationResponse, PatchOrganizationRequest};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn OrganizationUseCases + Send + Sync;

fn to_resp(o: Organization) -> OrganizationResponse {
    OrganizationResponse {
        id: o.id, name: o.name, slug: o.slug,
        created_at: o.created_at.to_rfc3339(),
        updated_at: o.updated_at.to_rfc3339(),
    }
}

fn claims(req: &HttpRequest) -> Result<JwtClaims, ApiError> {
    req.extensions().get::<JwtClaims>().cloned().ok_or_else(|| {
        ApiError(IoTBeeError::AuthError(domain::error::AuthError::InvalidToken))
    })
}

#[utoipa::path(get, path = "/admin/organization",
    responses(
        (status = 200, description = "Org", body = OrganizationResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin")]
#[get("")]
pub async fn read(req: HttpRequest, uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let org = uc.read(c.organization_id).await
        .map_err(|e| ApiError(IoTBeeError::OrganizationError(e)))?;
    Ok(HttpResponse::Ok().json(to_resp(org)))
}

#[utoipa::path(patch, path = "/admin/organization",
    request_body = PatchOrganizationRequest,
    responses(
        (status = 200, description = "Updated", body = OrganizationResponse),
        (status = 409, description = "Slug taken", body = ErrorResponse),
    ),
    tag = "Admin")]
#[patch("")]
pub async fn patch(
    req: HttpRequest,
    body: web::Json<PatchOrganizationRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let body = body.into_inner();
    let org = uc.update(c.organization_id, UpdateOrganization {
        name: body.name, slug: body.slug,
    }).await.map_err(|e| ApiError(IoTBeeError::OrganizationError(e)))?;
    Ok(HttpResponse::Ok().json(to_resp(org)))
}
```

`routers.rs`:

```rust
use actix_web::{Scope, web};

use domain::organization::inbound::organization_uses::OrganizationUseCases;

use super::handlers;

pub fn organization_scope(uc: web::Data<dyn OrganizationUseCases + Send + Sync>) -> Scope {
    web::scope("/organization")
        .app_data(uc)
        .service(handlers::read)
        .service(handlers::patch)
}
```

### 12.6 Assemble `admin_scope`

- [ ] **Step 9: `crates/adapters/src/api/admin/routers.rs`**

```rust
use actix_web::{Scope, web};

use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::auth::inbound::user_admin_uses::UserAdminUseCases;
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::system::inbound::system_uses::SystemUseCases;

use super::audit::routers::audit_scope;
use super::organization::routers::organization_scope;
use super::system::routers::system_scope;
use super::users::routers::users_scope;

pub struct AdminUseCases {
    pub audit: web::Data<dyn AuditUseCases + Send + Sync>,
    pub system: web::Data<dyn SystemUseCases + Send + Sync>,
    pub users: web::Data<dyn UserAdminUseCases + Send + Sync>,
    pub organization: web::Data<dyn OrganizationUseCases + Send + Sync>,
}

pub fn admin_scope(uc: AdminUseCases) -> Scope {
    web::scope("/admin")
        .service(audit_scope(uc.audit))
        .service(system_scope(uc.system))
        .service(users_scope(uc.users))
        .service(organization_scope(uc.organization))
}
```

- [ ] **Step 10: Add `pub mod admin;` in `crates/adapters/src/api/mod.rs`**

- [ ] **Step 11: cargo check**

Run: `cargo check -p adapters`
Expected: PASS.

- [ ] **Step 12: Commit (deferred)**

---

## Task 13: `AdminOnly` middleware

**Files:**
- Modify: `crates/adapters/src/api/ops_middleware.rs`

- [ ] **Step 1: Add the new transform/service pair**

Append to the bottom of `ops_middleware.rs`:

```rust
pub struct AdminOnly;

impl<S, B> Transform<S, ServiceRequest> for AdminOnly
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = AdminOnlyMw<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AdminOnlyMw { service: Rc::new(service) }))
    }
}

pub struct AdminOnlyMw<S> { service: Rc<S> }

impl<S, B> Service<ServiceRequest> for AdminOnlyMw<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        Box::pin(async move {
            let allowed = req.extensions().get::<JwtClaims>()
                .map(|c| c.role == "admin").unwrap_or(false);
            if !allowed {
                let resp = HttpResponse::Forbidden()
                    .json(serde_json::json!({"error": "admin only"}));
                return Ok(req.into_response(resp).map_into_right_body());
            }
            let res = svc.call(req).await?;
            Ok(res.map_into_left_body())
        })
    }
}
```

- [ ] **Step 2: cargo check**

Run: `cargo check`
Expected: still failing in api_composer until Task 14.

---

## Task 14: Composition — wire everything up

**Files:**
- Modify: `src/composition/app_state.rs`
- Modify: `src/composition/api_composition/api_composer.rs`

- [ ] **Step 1: Extend `AppState` with the new use cases and the audit repo**

Add fields and constructors. In `app_state.rs`, add imports:

```rust
use application::audit_cases::cases::AuditUseCasesImpl;
use application::organization_cases::cases::OrganizationUseCasesImpl;
use application::system_cases::cases::SystemUseCasesImpl;
use application::user_admin_cases::cases::UserAdminUseCasesImpl;
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::auth::inbound::user_admin_uses::UserAdminUseCases;
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::system::inbound::system_uses::SystemUseCases;
use infrastructure::persistence::repositories::audit_events_repository::SqliteAuditEventsRepository;
use infrastructure::persistence::repositories::organizations_repository::SqliteOrganizationsRepository;
use infrastructure::system::status_probe::SystemStatusProbeImpl;
use std::time::Instant;
```

Add a `process_start: Instant` field, set in `new`:

```rust
pub struct AppState {
    internal_data_base: Arc<InternalDataBase>,
    pub config: &'static Config,
    pub process_start: Instant,
}

impl AppState {
    pub fn new(internal_data_base: Arc<InternalDataBase>) -> Self {
        Self {
            internal_data_base,
            config: Config::get(),
            process_start: Instant::now(),
        }
    }
    // ...
}
```

Add the new app_state getters:

```rust
pub fn audit_repo(&self) -> Arc<dyn AuditRepository> {
    Arc::new(SqliteAuditEventsRepository::new(self.internal_data_base.clone()))
}

pub fn audit_app_state(&self) -> web::Data<dyn AuditUseCases + Send + Sync> {
    let repo = self.audit_repo();
    let uc: Arc<dyn AuditUseCases + Send + Sync> = Arc::new(AuditUseCasesImpl::new(repo));
    web::Data::from(uc)
}

pub fn system_app_state(&self) -> web::Data<dyn SystemUseCases + Send + Sync> {
    let probe = Arc::new(SystemStatusProbeImpl::new(
        self.internal_data_base.clone(),
        self.process_start,
        Some(self.config.rabbitmq_url.clone()),
    ));
    let uc: Arc<dyn SystemUseCases + Send + Sync> = Arc::new(SystemUseCasesImpl::new(probe));
    web::Data::from(uc)
}

pub fn user_admin_app_state(&self) -> web::Data<dyn UserAdminUseCases + Send + Sync> {
    let repo = Arc::new(SqliteUserRepository::new(self.internal_data_base.clone()));
    let hasher = Arc::new(Argon2Hasher::new());
    let uc: Arc<dyn UserAdminUseCases + Send + Sync> =
        Arc::new(UserAdminUseCasesImpl::new(repo, hasher));
    web::Data::from(uc)
}

pub fn organization_app_state(&self) -> web::Data<dyn OrganizationUseCases + Send + Sync> {
    let repo = Arc::new(SqliteOrganizationsRepository::new(self.internal_data_base.clone()));
    let uc: Arc<dyn OrganizationUseCases + Send + Sync> =
        Arc::new(OrganizationUseCasesImpl::new(repo));
    web::Data::from(uc)
}
```

> If `Config` doesn't expose `rabbitmq_url`, add it (read from env in `src/config.rs`).

- [ ] **Step 2: Wire `admin_scope` in `api_composer.rs`**

Add imports at the top:

```rust
use adapters::api::admin::routers::{admin_scope, AdminUseCases};
use adapters::api::ops_middleware::AdminOnly;
```

Inside `run`, after building the existing use cases, add:

```rust
let audit_use_case = app_state.audit_app_state();
let system_use_case = app_state.system_app_state();
let user_admin_use_case = app_state.user_admin_app_state();
let organization_use_case = app_state.organization_app_state();
let audit_repo = app_state.audit_repo();
```

Replace the `.wrap(AuditLog)` line with:

```rust
.wrap(AuditLog::new(audit_repo.clone()))
```

Inside the `HttpServer::new(move || { ... })` closure, add a new scope inside the authed section (just below the existing services):

```rust
.service(
    admin_scope(AdminUseCases {
        audit: audit_use_case.clone(),
        system: system_use_case.clone(),
        users: user_admin_use_case.clone(),
        organization: organization_use_case.clone(),
    })
    .wrap(AdminOnly),
),
```

Move `audit_use_case`, `system_use_case`, `user_admin_use_case`, `organization_use_case`, and `audit_repo` into the closure (clone-capture them at the outer scope, same pattern as `validation_schemas` etc.).

- [ ] **Step 3: cargo build the whole workspace**

Run: `cargo build`
Expected: PASS. No remaining compilation errors.

- [ ] **Step 4: cargo fmt + cargo test for all the pieces touched**

Run: `cargo fmt`
Run: `cargo test`
Expected: existing suite + new unit/integration tests PASS.

- [ ] **Step 5: One consolidated commit for backend Tasks 6–14**

```bash
git add crates/adapters/src/api crates/application/src crates/domain/src \
        crates/infrastructure/src src/composition tests/audit_events_repository.rs \
        tests/user_admin_application.rs
git commit -m "feat(admin): admin scope, audit persistence, system probe, users/org use cases"
```

---

## Task 15: API integration test for `/admin/*`

**Files:**
- Create: `tests/admin_endpoints_api.rs`

- [ ] **Step 1: Write the test file**

```rust
use std::sync::Arc;

use actix_web::{test, web, App};

use adapters::api::admin::routers::{admin_scope, AdminUseCases};
use adapters::api::auth::middleware::JwtAuth;
use adapters::api::auth::routers::auth_scope;
use adapters::api::ops_middleware::{AdminOnly, AuditLog, RolePolicy};

use application::audit_cases::cases::AuditUseCasesImpl;
use application::auth_cases::cases::AuthUseCasesImpl;
use application::organization_cases::cases::OrganizationUseCasesImpl;
use application::system_cases::cases::SystemUseCasesImpl;
use application::user_admin_cases::cases::UserAdminUseCasesImpl;

use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::auth::inbound::user_admin_uses::UserAdminUseCases;
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::system::inbound::system_uses::SystemUseCases;

use infrastructure::persistence::connection::InternalDataBase;
use infrastructure::persistence::repositories::audit_events_repository::SqliteAuditEventsRepository;
use infrastructure::persistence::repositories::organizations_repository::SqliteOrganizationsRepository;
use infrastructure::persistence::repositories::users_repository::SqliteUserRepository;
use infrastructure::security::argon2_hasher::Argon2Hasher;
use infrastructure::security::jwt_issuer::JwtIssuer;
use infrastructure::system::status_probe::SystemStatusProbeImpl;

use std::time::Instant;

async fn setup_db() -> Arc<InternalDataBase> {
    let _ = dotenvy::dotenv();
    let url = std::env::var("DATABASE_URL").unwrap();
    let db = Arc::new(InternalDataBase::new(&url).await.unwrap());
    sqlx::migrate!("./migrations").run(db.pool()).await.unwrap();
    sqlx::query("DELETE FROM audit_events").execute(db.pool()).await.unwrap();
    sqlx::query("DELETE FROM users WHERE email LIKE 'test-%'").execute(db.pool()).await.unwrap();
    db
}

fn build_app(db: Arc<InternalDataBase>) -> impl Fn() -> App<...> { /* see actix_web::App docs */ }

#[actix_web::test]
async fn operator_gets_403_on_admin_list_users() {
    // 1. Build app with the same middleware stack as production.
    // 2. Create an operator user, mint a JWT for them.
    // 3. Call GET /admin/users with that JWT.
    // 4. Assert 403.
}

#[actix_web::test]
async fn admin_can_list_users() { /* analogous, expect 200 + items */ }

#[actix_web::test]
async fn admin_create_user_writes_audit_row() {
    // 1. POST /admin/users as admin.
    // 2. Poll audit_events for up to 1 second (tokio::spawn is async).
    // 3. Assert a row with method=POST, path=/admin/users, status=201.
}

#[actix_web::test]
async fn admin_cannot_deactivate_self() {
    // DELETE /admin/users/{self_id} -> 400 with CannotDeactivateSelf.
}

#[actix_web::test]
async fn slug_collision_returns_409() {
    // PATCH /admin/organization with an existing slug -> 409.
}
```

The empty bodies are placeholders. **Each** body should be filled in by the implementer; copy the pattern from `tests/auth_api.rs`. The reason this isn't fully spelled out: `tests/auth_api.rs` already shows the exact request-builder pattern this repo uses (`test::init_service`, `TestRequest::post().uri(...).set_json(...).to_request()`).

- [ ] **Step 2: Run the suite**

Run: `DATABASE_URL=sqlite://./data/iot_bee.db cargo test --test admin_endpoints_api -- --test-threads=1`
Expected: all 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/admin_endpoints_api.rs
git commit -m "test(admin): integration tests for /admin/* endpoints and audit persistence"
```

---

## Task 16: Frontend — types and API client helpers

**Files:**
- Modify: `web/lib/api/types.ts`
- Create: `web/lib/api/endpoints/admin.ts`

- [ ] **Step 1: Add types to `web/lib/api/types.ts`**

Append:

```ts
export interface AuditEvent {
  id: number;
  organizationId: number | null;
  userId: number | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditListResponse {
  items: AuditEvent[];
  nextCursor: number | null;
}

export interface AuditFilters {
  userId?: number;
  method?: string;
  pathContains?: string;
  status?: number;
  from?: string;
  to?: string;
  cursor?: number;
  limit?: number;
}

export interface Dependency {
  name: string;
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
}

export interface SystemStatus {
  probedAt: string;
  dependencies: Dependency[];
  runtime: {
    configuredPipelines: number;
    liveReplicas: number | null;
    msgsLastHour: number | null;
  };
  build: { commit: string; buildTime: string; uptimeSeconds: number };
}

export interface AdminUser {
  id: number;
  organizationId: number;
  email: string;
  name: string;
  role: "admin" | "operator";
  status: "active" | "disabled";
  mustResetPassword: boolean;
  createdAt: string;
}

export interface AdminUsersListResponse { items: AdminUser[] }

export interface CreateAdminUserRequest {
  email: string;
  name: string;
  role: "admin" | "operator";
  tempPassword: string;
}

export interface PatchAdminUserRequest {
  name?: string;
  role?: "admin" | "operator";
  status?: "active" | "disabled";
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatchOrganizationRequest {
  name?: string;
  slug?: string;
}
```

Also extend `UserResponse` with `mustResetPassword?: boolean` and the backend `MeResponse` so the frontend can see the flag in the future (the current login screen does not change).

- [ ] **Step 2: Write `web/lib/api/endpoints/admin.ts`**

```ts
import { api } from "../client";
import type {
  AdminUser, AdminUsersListResponse, AuditFilters, AuditListResponse,
  CreateAdminUserRequest, Organization, PatchAdminUserRequest, PatchOrganizationRequest,
  SystemStatus,
} from "../types";

function qs(f: AuditFilters): string {
  const p = new URLSearchParams();
  if (f.userId != null)        p.set("user_id", String(f.userId));
  if (f.method)                p.set("method", f.method);
  if (f.pathContains)          p.set("path_contains", f.pathContains);
  if (f.status != null)        p.set("status", String(f.status));
  if (f.from)                  p.set("from", f.from);
  if (f.to)                    p.set("to", f.to);
  if (f.cursor != null)        p.set("cursor", String(f.cursor));
  if (f.limit != null)         p.set("limit", String(f.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const adminApi = {
  // Audit
  listAudit:        (f: AuditFilters = {}) => api<AuditListResponse>(`/admin/audit${qs(f)}`),
  // System
  systemStatus:     ()                        => api<SystemStatus>("/admin/system/status"),
  // Users
  listUsers:        ()                        => api<AdminUsersListResponse>("/admin/users"),
  createUser:       (b: CreateAdminUserRequest) => api<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(b) }),
  patchUser:        (id: number, b: PatchAdminUserRequest) => api<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(b) }),
  deactivateUser:   (id: number)               => api<void>(`/admin/users/${id}`, { method: "DELETE" }),
  // Org
  organization:     ()                        => api<Organization>("/admin/organization"),
  patchOrganization:(b: PatchOrganizationRequest) => api<Organization>("/admin/organization", { method: "PATCH", body: JSON.stringify(b) }),
};
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/api/types.ts web/lib/api/endpoints/admin.ts
git commit -m "feat(web): admin API types and endpoint helpers"
```

---

## Task 17: Frontend — hooks

**Files:**
- Create: `web/lib/hooks/useAudit.ts`
- Create: `web/lib/hooks/useSystemStatus.ts`
- Create: `web/lib/hooks/useAdminUsers.ts`
- Create: `web/lib/hooks/useOrganization.ts`

- [ ] **Step 1: `useAudit.ts`**

```ts
"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import type { AuditFilters } from "@/lib/api/types";

export function useAuditEvents(filters: AuditFilters) {
  return useInfiniteQuery({
    queryKey: ["admin", "audit", filters],
    queryFn: ({ pageParam }) =>
      adminApi.listAudit({ ...filters, cursor: pageParam, limit: 50 }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
```

- [ ] **Step 2: `useSystemStatus.ts`**

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";

export function useSystemStatus() {
  return useQuery({
    queryKey: ["admin", "system", "status"],
    queryFn: adminApi.systemStatus,
    refetchInterval: 10_000,
  });
}
```

- [ ] **Step 3: `useAdminUsers.ts`**

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import { useToasts } from "@/lib/store/useToasts";
import type { CreateAdminUserRequest, PatchAdminUserRequest } from "@/lib/api/types";

export function useAdminUsers() {
  return useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.listUsers });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreateAdminUserRequest) => adminApi.createUser(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      push({ kind: "success", message: "user created" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function usePatchAdminUser(id: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: PatchAdminUserRequest) => adminApi.patchUser(id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      push({ kind: "success", message: "user updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}

export function useDeactivateAdminUser() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => adminApi.deactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      push({ kind: "success", message: "user deactivated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
```

- [ ] **Step 4: `useOrganization.ts`**

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/endpoints/admin";
import { useToasts } from "@/lib/store/useToasts";
import type { PatchOrganizationRequest } from "@/lib/api/types";

export function useOrganization() {
  return useQuery({ queryKey: ["admin", "organization"], queryFn: adminApi.organization });
}

export function usePatchOrganization() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: PatchOrganizationRequest) => adminApi.patchOrganization(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "organization"] });
      push({ kind: "success", message: "organization updated" });
    },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add web/lib/hooks/useAudit.ts web/lib/hooks/useSystemStatus.ts \
        web/lib/hooks/useAdminUsers.ts web/lib/hooks/useOrganization.ts
git commit -m "feat(web): admin hooks (audit, system, users, organization)"
```

---

## Task 18: Frontend — `AdminShell`, `AdminSidebar`, layout guard

**Files:**
- Create: `web/components/admin/AdminShell.tsx`
- Create: `web/components/admin/AdminSidebar.tsx`
- Create: `web/app/(admin)/layout.tsx`
- Create: `web/app/(admin)/admin/layout.tsx`
- Create: `web/app/(admin)/admin/page.tsx`

- [ ] **Step 1: `AdminSidebar.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/admin/users",         label: "users" },
  { href: "/admin/audit",         label: "audit" },
  { href: "/admin/system",        label: "system" },
  { href: "/admin/organization",  label: "organization" },
  { href: "/admin/billing",       label: "billing" },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="w-[200px] shrink-0 border-r border-[#1f1f1f] bg-[#050505] font-mono py-3">
      <div className="px-4 pb-2 text-[10px] tracking-[2px] uppercase text-[var(--color-fg-4)]">
        {"// "}admin
      </div>
      {items.map((it) => {
        const active = path?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "block px-4 py-3 text-[14px] border-l-4 transition-colors",
              active
                ? "text-[var(--color-fg-0)] border-l-[var(--color-accent)] bg-[var(--color-bg-elev)]"
                : "text-[var(--color-fg-2)] border-l-transparent hover:bg-[var(--color-bg-elev)]",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </aside>
  );
}
```

- [ ] **Step 2: `AdminShell.tsx`**

```tsx
import Link from "next/link";
import { BrandMark } from "@/components/Logo";
import { AdminSidebar } from "./AdminSidebar";

export function AdminShell({
  orgName,
  children,
}: {
  orgName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#050505] border-b border-[var(--color-accent)] px-5 py-3 flex items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          <BrandMark size={24} />
          <span className="text-[12px] uppercase tracking-[2px] text-[var(--color-fg-3)]">
            admin · org={orgName}
          </span>
        </div>
        <Link
          href="/app"
          className="text-[13px] border border-[#333] text-[var(--color-fg-1)] hover:border-[var(--color-accent)] px-3 py-1.5 rounded-[2px]"
        >
          ← back to app
        </Link>
      </header>
      <div className="flex-1 flex">
        <AdminSidebar />
        <main className="flex-1 p-6 max-w-[1280px] w-full">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `web/app/(admin)/layout.tsx` — server-side guard**

```tsx
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth/session";
import { apiAuthed } from "@/lib/api/server";
import type { MeResponse, Organization } from "@/lib/api/types";
import { AdminShell } from "@/components/admin/AdminShell";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default async function AdminLayoutGroup({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  if (!token) redirect("/login");
  let me: MeResponse;
  try { me = await apiAuthed<MeResponse>("/auth/me"); }
  catch { redirect("/login"); }
  if (me.user.role !== "admin") redirect("/app");
  let org: Organization | null = null;
  try { org = await apiAuthed<Organization>("/admin/organization"); } catch {}
  return (
    <QueryProvider>
      <AdminShell orgName={org?.name ?? "—"}>{children}</AdminShell>
    </QueryProvider>
  );
}
```

- [ ] **Step 4: `web/app/(admin)/admin/page.tsx` — redirect to users**

```tsx
import { redirect } from "next/navigation";
export default function AdminIndex() { redirect("/admin/users"); }
```

- [ ] **Step 5: Commit**

```bash
git add web/components/admin/AdminShell.tsx web/components/admin/AdminSidebar.tsx \
        web/app/\(admin\)/
git commit -m "feat(web): admin shell, sidebar, role guard"
```

---

## Task 19: Frontend — TopNav admin entry

**Files:**
- Modify: `web/components/shell/TopNav.tsx`

- [ ] **Step 1: Add the dropdown entry — desktop**

Inside the dropdown JSX (after the `signed in as` block, before the `Sign out` button), insert:

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

You also need `import Link from "next/link";` if it's not already there (it is — TopNav already uses it).

- [ ] **Step 2: Add the mobile drawer entry**

Inside the mobile drawer, just above the `↪ Sign out` button:

```tsx
{user.role === "admin" && (
  <Link
    href="/admin"
    onClick={() => setDrawerOpen(false)}
    className="block w-full text-center text-[14px] border border-[var(--color-accent)] text-[var(--color-accent)] px-4 py-3 rounded-[2px] mb-3"
  >
    → Admin panel
  </Link>
)}
```

- [ ] **Step 3: Smoke check the type**

Run: `cd web && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add web/components/shell/TopNav.tsx
git commit -m "feat(web): add admin panel entry in user dropdown"
```

---

## Task 20: Frontend — admin pages

**Files:**
- Create: `web/app/(admin)/admin/users/page.tsx`
- Create: `web/components/admin/users/UsersTable.tsx`
- Create: `web/components/admin/users/UserRow.tsx`
- Create: `web/components/admin/users/CreateUserDialog.tsx`
- Create: `web/app/(admin)/admin/audit/page.tsx`
- Create: `web/components/admin/audit/AuditTable.tsx`
- Create: `web/components/admin/audit/AuditFilters.tsx`
- Create: `web/app/(admin)/admin/system/page.tsx`
- Create: `web/components/admin/system/StatusCard.tsx`
- Create: `web/components/admin/system/StatusGrid.tsx`
- Create: `web/app/(admin)/admin/organization/page.tsx`
- Create: `web/components/admin/organization/OrgForm.tsx`
- Create: `web/app/(admin)/admin/billing/page.tsx`

> The implementer can lean on existing UI primitives from `web/components/ui/` (`Panel`, `Pill`, `Table`, `Button`) — they match the visual language. Each step below ships one feature behind a single commit. Bare minimum component contracts are spelled out; the engineer fills in styles consistent with the existing repo (compare to `web/app/(app)/sources/page.tsx` and `stores/page.tsx`).

### 20.1 Users page

- [ ] **Step 1: `CreateUserDialog.tsx`** with email/name/role/tempPassword fields. Generate `tempPassword` on mount via:

```ts
function generateTempPassword(): string {
  const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += a[Math.floor(Math.random() * a.length)];
  return out;
}
```

Show the password readable with a copy-to-clipboard button. Submit calls `useCreateAdminUser`.

- [ ] **Step 2: `UserRow.tsx` and `UsersTable.tsx`** — table of `AdminUser[]`. Role column inline `<select>` calls `usePatchAdminUser(id)`. Status column shows a `Pill` (active=green, disabled=neutral). Actions column has a `Deactivate` button gated behind `useConfirmDelete` (already exists in the repo).

- [ ] **Step 3: `users/page.tsx`** glues a header (title + "Create user" button that opens the dialog) and `UsersTable`. Hide the Deactivate button on the row where `user.id === meId` (read `meId` from a server prop or from `/auth/me` via a small hook — `useAuthMe` if it exists, else just hide self by passing `meId` from the layout via props).

- [ ] **Step 4: typecheck + commit**

```bash
cd web && npm run typecheck
git add web/components/admin/users web/app/\(admin\)/admin/users
git commit -m "feat(web): admin users page with create/role/deactivate"
```

### 20.2 Audit page

- [ ] **Step 5: `AuditFilters.tsx`** — controlled component that produces an `AuditFilters` object via `onChange`. Fields: user email autocomplete (from `useAdminUsers().data?.items`), method select (`GET/POST/PATCH/DELETE`), status select (`200/201/204/400/403/404/409/500`), `from`/`to` `<input type="datetime-local">`, `pathContains` text input.

- [ ] **Step 6: `AuditTable.tsx`** — receives `pages: AuditListResponse[]` and `fetchNextPage` / `hasNextPage`. Columns: timestamp, user (`email` + role badge), method+path (path is `mono`), status (color-coded), IP. Bottom button "Load more" calls `fetchNextPage()` while `hasNextPage`.

- [ ] **Step 7: `audit/page.tsx`** owns the filters state, passes them to `useAuditEvents(filters)`, and renders `<AuditFilters>` + `<AuditTable>`.

- [ ] **Step 8: typecheck + commit**

```bash
git add web/components/admin/audit web/app/\(admin\)/admin/audit
git commit -m "feat(web): admin audit page with filters and cursor pagination"
```

### 20.3 System page

- [ ] **Step 9: `StatusCard.tsx`** — generic card with title, body, and a small "status dot" (green/red) based on a boolean. Reuses `Panel`.

- [ ] **Step 10: `StatusGrid.tsx`** — 2×2 grid (mobile: stacked) of cards: Dependencies (one row per `Dependency`), Runtime (configuredPipelines + liveReplicas if present), Build (commit short SHA + uptime as human "Nh Mm").

- [ ] **Step 11: `system/page.tsx`** uses `useSystemStatus()` and renders `<StatusGrid status={data} />`. Header shows "last probed at {probedAt}".

- [ ] **Step 12: typecheck + commit**

```bash
git add web/components/admin/system web/app/\(admin\)/admin/system
git commit -m "feat(web): admin system page with deps/runtime/build cards"
```

### 20.4 Organization page

- [ ] **Step 13: `OrgForm.tsx`** — controlled `<form>` with name, slug. Validate slug client-side with `^[a-z0-9-]+$`. On submit, call `usePatchOrganization`.

- [ ] **Step 14: `organization/page.tsx`** reads via `useOrganization()` and renders `<OrgForm initial={data} />`.

- [ ] **Step 15: typecheck + commit**

```bash
git add web/components/admin/organization web/app/\(admin\)/admin/organization
git commit -m "feat(web): admin organization page (name/slug edit)"
```

### 20.5 Billing shortcut

- [ ] **Step 16: `web/app/(admin)/admin/billing/page.tsx`**

```tsx
"use client";
import BillingPage from "@/app/(app)/billing/page";
export default BillingPage;
```

> If the operator billing page is server-rendered or relies on the (app) layout's QueryProvider, copy the content of `(app)/billing/page.tsx` here instead of re-exporting. The simplest path is re-export.

- [ ] **Step 17: typecheck + commit**

```bash
git add web/app/\(admin\)/admin/billing
git commit -m "feat(web): admin billing shortcut"
```

---

## Task 21: Frontend tests

**Files:**
- Create: `web/test/admin/AdminSidebar.test.tsx`
- Create: `web/test/admin/AuditFilters.test.tsx`
- Create: `web/test/admin/CreateUserDialog.test.tsx`

- [ ] **Step 1: `AdminSidebar.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/audit" }));

import { AdminSidebar } from "@/components/admin/AdminSidebar";

describe("AdminSidebar", () => {
  it("marks the audit entry as active when on /admin/audit", () => {
    render(<AdminSidebar />);
    const audit = screen.getByText("audit");
    expect(audit.className).toMatch(/border-l-\[var\(--color-accent\)\]/);
    const users = screen.getByText("users");
    expect(users.className).not.toMatch(/border-l-\[var\(--color-accent\)\]/);
  });
});
```

- [ ] **Step 2: `AuditFilters.test.tsx`** — render, type into `pathContains`, fire change handler, assert the emitted filter equals `{ pathContains: "/api/v1/pipelines" }`. Use `@testing-library/user-event`.

- [ ] **Step 3: `CreateUserDialog.test.tsx`** — render, assert generated temp password length is 12, assert copy button works (mock `navigator.clipboard.writeText`).

- [ ] **Step 4: Run tests**

Run: `cd web && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/test/admin
git commit -m "test(web): admin sidebar, audit filters, create-user dialog"
```

---

## Task 22: End-to-end smoke + final commit

- [ ] **Step 1: Start the backend**

Run: `cargo run`
Expected: server on 127.0.0.1:8080, migrations applied, default admin user present.

- [ ] **Step 2: Start the web dev server**

Run: `cd web && npm run dev`
Expected: Next.js dev server on http://localhost:3000.

- [ ] **Step 3: Walk the path manually**

1. Open http://localhost:3000/login, sign in as the default admin.
2. Click the user dropdown in the top-right; confirm "→ Admin panel" entry is present.
3. Click it → page lands on `/admin/users` and lists at least one user (the default admin).
4. Click "Create user", fill the form (`role=operator`), submit. Toast says "user created". The row appears.
5. Go to `/admin/audit`, confirm a row with method=POST, path=/admin/users.
6. Go to `/admin/system`. All three cards render. The DB dependency shows OK with a latency. The RabbitMQ card shows OK if a broker is configured, otherwise shows the configured error gracefully.
7. Go to `/admin/organization`, edit the name, save. Toast confirms. Refresh — the new name persists.
8. Log out, log in as the operator user we created. Confirm the dropdown does NOT show "→ Admin panel". Manually navigate to `/admin` — the layout guard redirects to `/app`.

- [ ] **Step 4: Run the full backend test suite once more**

Run: `cargo test`
Expected: PASS.

- [ ] **Step 5: Run cargo fmt**

Run: `cargo fmt`
Run: `git status` — expected: clean unless fmt rewrote some files. If it did, commit them.

- [ ] **Step 6: Push and open PR**

```bash
git push -u origin feature/frontend
gh pr create --title "feat: admin & operator views" --body "$(cat <<'EOF'
## Summary
- Admin panel at `/admin` (users / audit / system / organization + billing shortcut), entered via the user dropdown
- Audit middleware now persists mutable HTTP actions to `audit_events`
- New backend scope `/api/v1/admin/*` behind `AdminOnly`
- `must_reset_password` flag added to users (forced reset screen tracked as follow-up)

## Test plan
- [ ] cargo test passes
- [ ] cd web && npm test && npm run typecheck pass
- [ ] Manual smoke per docs/superpowers/plans/2026-05-16-admin-operator-views.md Task 22
- [ ] Operator user cannot reach /admin (UI hides entry + layout redirects + backend 403s)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Roles admin+operator only ✓ — enforced in `RolePolicy` (unchanged) + new `AdminOnly` (Task 13)
- TopNav identical for both ✓ — admin entry is conditional inside dropdown (Task 19)
- Billing stays top-level + duplicated in admin sidebar ✓ — sidebar entry (Task 18.1), shortcut page (Task 20.5)
- Audit persistence to `audit_events` ✓ — repo (Task 5) + middleware (Task 6)
- Audit filters incl. `path_contains` ✓ — Task 12.2 + Task 16/17/20.2
- System cards: deps + runtime + build/uptime ✓ — Task 8 + Task 20.3; rate-limit/errors deferred (spec section "Out of scope")
- Users: create with temp-password, change role, soft-deactivate ✓ — Tasks 10 + 12.4 + 20.1
- `must_reset_password` migration + flag ✓ — Tasks 1–3
- Frontend guard + backend `AdminOnly` ✓ — Tasks 13, 18
- Tests: domain in-memory, sqlx, API integration, frontend ✓ — Tasks 5, 10, 15, 21

**Placeholder scan:** No `TBD`/`TODO`. Task 15 has skeleton test bodies but cites `tests/auth_api.rs` as the explicit pattern to copy — that's a documented expansion, not a placeholder. Task 5 step 3 has an intentionally-marked "delete this scaffolding" block — the engineer must read the inline note. Task 20 references the existing `useConfirmDelete` and `Pill`/`Panel` primitives; these already exist in the repo and the engineer can find them by grep.

**Type consistency:** Backend `AuditEvent` ↔ frontend `AuditEvent` (camelCase JSON via `#[serde(rename = ...)]`) — keys match. `AdminUser.role` is `"admin" | "operator"` on the frontend; backend uses string. `must_reset_password` flows through user.rs → repo → handler → frontend `mustResetPassword`. `next_cursor` (backend `Option<i64>`) ↔ `nextCursor: number | null` (frontend) — checked.

**Scope check:** Self-contained MVP. Rate-limit metrics, email invites, reset-password screen, and cross-resource org isolation are all explicit follow-ups per spec.
