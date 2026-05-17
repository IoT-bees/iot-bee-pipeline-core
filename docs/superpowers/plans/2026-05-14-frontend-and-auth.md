# Frontend & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add JWT auth to the Rust backend and ship a Next.js web app (landing + login + protected app exposing every existing API module) in the brutalist dev-console aesthetic.

**Architecture:** Single workspace. Backend gains an `auth` aggregate following the existing hexagonal pattern (domain → application → infrastructure → adapters) plus a JWT middleware that protects all existing routes. Next.js 15 (App Router) lives in a new `web/` directory using TypeScript, Tailwind v4, react-query, react-hook-form/zod, and `cmdk` for the command palette. Auth uses HttpOnly cookies set by Next route handlers translating `Authorization: Bearer` for backend calls.

**Tech Stack:** Rust (actix-web 4, sqlx, argon2, jsonwebtoken), Next.js 15 + TS, Tailwind v4, @tanstack/react-query, react-hook-form, zod, cmdk, lucide-react, vitest + @testing-library/react + msw, Playwright, pnpm.

**Spec reference:** `docs/superpowers/specs/2026-05-14-frontend-design.md`.

**PR-able phase boundaries** (any cut here is a coherent merge):
1. Backend Auth (P1) → backend gains `/auth/*` and middleware. Demoable via curl.
2. Web scaffold + Auth pages (P2 + P3) → Next can login but no app pages.
3. API client + simple modules (P4 + P5) → app is usable for sources/stores/groups CRUD.
4. Schemas + Pipelines (P6 + P7) → full feature parity with backend.
5. Landing + responsive polish + e2e (P8 + P9) → ready to publish.

---

## File Structure (will be created/modified)

**Backend (Rust):**
- `Cargo.toml` (workspace) — add `argon2`, `jsonwebtoken` to `[workspace.dependencies]`.
- `migrations/0017_create_users_table.sql` (new).
- `crates/domain/src/auth/{mod.rs, entities/user.rs, value_objects/{email.rs, password_hash.rs, claims.rs}, inbound/auth_uses.rs, outbound/{user_repository.rs, password_hasher.rs, token_issuer.rs}, error.rs}` (new).
- `crates/domain/src/error.rs` — add `AuthError` variant.
- `crates/domain/src/lib.rs` — register `auth` module.
- `crates/application/src/auth_cases/{mod.rs, cases.rs}` (new).
- `crates/application/src/lib.rs` — register `auth_cases`.
- `crates/infrastructure/src/persistence/repositories/users_repository.rs` (new) + `mod.rs` registration.
- `crates/infrastructure/src/security/{mod.rs, argon2_hasher.rs, jwt_issuer.rs}` (new) + `lib.rs` registration.
- `crates/adapters/src/api/auth/{mod.rs, models.rs, handlers.rs, routers.rs, middleware.rs}` (new).
- `crates/adapters/src/api/api_docs.rs` — register auth paths/schemas.
- `crates/adapters/src/api/error.rs` — extend `ApiError` mapping with `AuthError`.
- `src/composition/app_state.rs` — add `auth_app_state()` + JWT secret helper.
- `src/composition/api_composition/api_composer.rs` — wire auth scope, CORS, middleware on existing scopes.
- `src/config.rs` — add `jwt_secret`, `jwt_expires_in_hours`, `cors_origins`.
- Test files under `tests/` (new): `auth_domain.rs`, `auth_application.rs`, `argon2_hasher.rs`, `jwt_issuer.rs`, `users_repository.rs`, `auth_api.rs`.
- `Cargo.toml` (root) — register the 6 new `[[test]]` entries.

**Frontend (Next.js, all under `web/`):**
- Project skeleton: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.local.example`, `.eslintrc.json`, `vitest.config.ts`, `playwright.config.ts`.
- `app/layout.tsx`, `app/globals.css`, `app/(marketing)/page.tsx`, `app/(auth)/{login,register}/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `app/(app)/{pipelines, sources, stores, schemas, groups, settings}/...`
- `app/api/auth/{login, logout, register}/route.ts`.
- `middleware.ts` (route gating).
- `components/ui/{Button.tsx, Pill.tsx, Input.tsx, Panel.tsx, Toast.tsx, Table.tsx, FormField.tsx, EmptyState.tsx}`.
- `components/shell/{TopNav.tsx, CommandBar.tsx, Footer.tsx, AppShell.tsx}`.
- `components/landing/*` (sections).
- `lib/api/{client.ts, types.ts, endpoints/{auth,pipelines,sources,stores,schemas,groups,lifecycle}.ts}`.
- `lib/hooks/*` (one file per resource + `useAuth`).
- `lib/auth/{session.ts, guard.tsx}`.
- `lib/schemas/*` (zod).
- `lib/store/{useCommandBar.ts, useToasts.ts}` (zustand).
- `test/msw/{handlers.ts, server.ts}`, `test/e2e/happy-path.spec.ts`.

---

## Phase 1 — Backend Auth

### Task 1: Add dependencies and migration

**Files:**
- Modify: `Cargo.toml` (workspace `[workspace.dependencies]`).
- Create: `migrations/0017_create_users_table.sql`.

- [ ] **Step 1: Add crates to workspace dependencies**

Edit `Cargo.toml`, add under `[workspace.dependencies]` near the existing `validator`/`uuid` lines:

```toml
# Auth
argon2 = "0.5.3"
jsonwebtoken = "9.3.0"
```

- [ ] **Step 2: Create the users migration**

Create `migrations/0017_create_users_table.sql` with exactly:

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

- [ ] **Step 3: Verify migration applies cleanly**

Run:
```bash
sqlx migrate run --database-url sqlite://data/iot-bee.db
sqlite3 data/iot-bee.db ".schema users"
```
Expected: `CREATE TABLE users (...)` echoed back.

- [ ] **Step 4: Commit**

```bash
git add Cargo.toml migrations/0017_create_users_table.sql
git commit -m "auth: add argon2/jsonwebtoken deps and users migration"
```

---

### Task 2: Domain — User entity, value objects, and ports

**Files:**
- Create: `crates/domain/src/auth/mod.rs`, `entities/user.rs`, `entities/mod.rs`, `value_objects/{mod.rs, email.rs, password_hash.rs, claims.rs}`, `inbound/{mod.rs, auth_uses.rs}`, `outbound/{mod.rs, user_repository.rs, password_hasher.rs, token_issuer.rs}`, `error.rs`.
- Modify: `crates/domain/src/lib.rs`, `crates/domain/src/error.rs`.

- [ ] **Step 1: Create domain auth module skeleton**

Create `crates/domain/src/auth/mod.rs`:
```rust
pub mod entities;
pub mod value_objects;
pub mod inbound;
pub mod outbound;
pub mod error;
```

Create `crates/domain/src/auth/entities/mod.rs`:
```rust
pub mod user;
```

Create `crates/domain/src/auth/value_objects/mod.rs`:
```rust
pub mod email;
pub mod password_hash;
pub mod claims;
```

Create `crates/domain/src/auth/inbound/mod.rs`:
```rust
pub mod auth_uses;
```

Create `crates/domain/src/auth/outbound/mod.rs`:
```rust
pub mod user_repository;
pub mod password_hasher;
pub mod token_issuer;
```

- [ ] **Step 2: Register `auth` in `crates/domain/src/lib.rs`**

Read the file first; add `pub mod auth;` next to the other top-level `pub mod` declarations.

- [ ] **Step 3: Add `AuthError` variant to `crates/domain/src/error.rs`**

Append before the `IoTBeeError` enum:

```rust
#[derive(Error, Debug, Clone)]
pub enum AuthError {
    #[error("invalid credentials")]
    InvalidCredentials,
    #[error("email '{email}' is already taken")]
    EmailAlreadyTaken { email: String },
    #[error("registration is disabled")]
    RegistrationDisabled,
    #[error("invalid token")]
    InvalidToken,
    #[error("expired token")]
    ExpiredToken,
    #[error("password is too weak: {reason}")]
    WeakPassword { reason: String },
    #[error("internal auth error: {reason}")]
    Internal { reason: String },
}
```

Inside `IoTBeeError`, add:
```rust
    #[error("Auth error: {0}")]
    AuthError(#[from] AuthError),
```

- [ ] **Step 4: Write the User entity**

Create `crates/domain/src/auth/entities/user.rs`:
```rust
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct User {
    pub id: i64,
    pub email: String,
    pub name: String,
    pub password_hash: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct NewUser {
    pub email: String,
    pub name: String,
    pub password_hash: String,
    pub role: String,
}
```

- [ ] **Step 5: Write Email value object with validation**

Create `crates/domain/src/auth/value_objects/email.rs`:
```rust
use crate::auth::error::AuthError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Email(String);

impl Email {
    pub fn parse(raw: impl Into<String>) -> Result<Self, AuthError> {
        let raw = raw.into().trim().to_lowercase();
        if raw.is_empty() || !raw.contains('@') || raw.len() > 254 {
            return Err(AuthError::Internal { reason: format!("invalid email '{raw}'") });
        }
        Ok(Email(raw))
    }

    pub fn as_str(&self) -> &str { &self.0 }
    pub fn into_string(self) -> String { self.0 }
}
```

Create `crates/domain/src/auth/error.rs` (re-export so the value objects can use a local path):
```rust
pub use crate::error::AuthError;
```

- [ ] **Step 6: Write PasswordHash and Claims value objects**

Create `crates/domain/src/auth/value_objects/password_hash.rs`:
```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PasswordHash(String);

impl PasswordHash {
    pub fn from_raw(raw: String) -> Self { Self(raw) }
    pub fn as_str(&self) -> &str { &self.0 }
    pub fn into_string(self) -> String { self.0 }
}
```

Create `crates/domain/src/auth/value_objects/claims.rs`:
```rust
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct JwtClaims {
    pub user_id: i64,
    pub email: String,
    pub role: String,
    pub issued_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}
```

- [ ] **Step 7: Write the inbound port (AuthUseCases trait)**

Create `crates/domain/src/auth/inbound/auth_uses.rs`:
```rust
use async_trait::async_trait;
use crate::auth::entities::user::User;
use crate::auth::value_objects::claims::JwtClaims;
use crate::error::AuthError;

#[async_trait]
pub trait AuthUseCases: Send + Sync {
    async fn register(&self, email: String, name: String, password: String)
        -> Result<(User, String), AuthError>;
    async fn login(&self, email: String, password: String)
        -> Result<(User, String), AuthError>;
    async fn verify_token(&self, token: &str) -> Result<JwtClaims, AuthError>;
    async fn get_user(&self, user_id: i64) -> Result<User, AuthError>;
    async fn has_users(&self) -> Result<bool, AuthError>;
}
```

- [ ] **Step 8: Write the outbound ports**

Create `crates/domain/src/auth/outbound/user_repository.rs`:
```rust
use async_trait::async_trait;
use crate::auth::entities::user::{User, NewUser};
use crate::error::AuthError;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn count(&self) -> Result<i64, AuthError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError>;
    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError>;
    async fn create(&self, new_user: NewUser) -> Result<User, AuthError>;
}
```

Create `crates/domain/src/auth/outbound/password_hasher.rs`:
```rust
use crate::error::AuthError;

pub trait PasswordHasher: Send + Sync {
    fn hash(&self, plain: &str) -> Result<String, AuthError>;
    fn verify(&self, plain: &str, hash: &str) -> Result<bool, AuthError>;
}
```

Create `crates/domain/src/auth/outbound/token_issuer.rs`:
```rust
use crate::auth::value_objects::claims::JwtClaims;
use crate::error::AuthError;

pub trait TokenIssuer: Send + Sync {
    fn issue(&self, user_id: i64, email: &str, role: &str) -> Result<String, AuthError>;
    fn verify(&self, token: &str) -> Result<JwtClaims, AuthError>;
}
```

- [ ] **Step 9: Compile-check the domain crate**

Run:
```bash
cargo check -p domain
```
Expected: clean build (warnings about unused variants OK).

- [ ] **Step 10: Commit**

```bash
git add crates/domain/src/auth migrations/0017_create_users_table.sql crates/domain/src/lib.rs crates/domain/src/error.rs
git commit -m "domain/auth: User, Email, PasswordHash, Claims and ports"
```

---

### Task 3: Application — AuthUseCasesImpl with TDD

**Files:**
- Create: `crates/application/src/auth_cases/{mod.rs, cases.rs}`.
- Modify: `crates/application/src/lib.rs`.
- Create: `tests/auth_application.rs`.
- Modify: `Cargo.toml` (root) — add `[[test]]` entry.

- [ ] **Step 1: Register `auth_cases` in `crates/application/src/lib.rs`**

Append:
```rust
pub mod auth_cases;
```

Create `crates/application/src/auth_cases/mod.rs`:
```rust
pub mod cases;
```

- [ ] **Step 2: Write the failing application test**

Create `tests/auth_application.rs`:
```rust
use std::sync::{Arc, Mutex};
use async_trait::async_trait;
use chrono::Utc;
use domain::auth::entities::user::{NewUser, User};
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::token_issuer::TokenIssuer;
use domain::auth::outbound::user_repository::UserRepository;
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::AuthError;
use application::auth_cases::cases::AuthUseCasesImpl;

#[derive(Default)]
struct InMemRepo { users: Mutex<Vec<User>>, next_id: Mutex<i64> }
#[async_trait]
impl UserRepository for InMemRepo {
    async fn count(&self) -> Result<i64, AuthError> {
        Ok(self.users.lock().unwrap().len() as i64)
    }
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError> {
        Ok(self.users.lock().unwrap().iter().find(|u| u.email == email).cloned())
    }
    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError> {
        Ok(self.users.lock().unwrap().iter().find(|u| u.id == id).cloned())
    }
    async fn create(&self, new_user: NewUser) -> Result<User, AuthError> {
        let mut id = self.next_id.lock().unwrap();
        *id += 1;
        let user = User {
            id: *id, email: new_user.email, name: new_user.name,
            password_hash: new_user.password_hash, role: new_user.role,
            created_at: Utc::now(),
        };
        self.users.lock().unwrap().push(user.clone());
        Ok(user)
    }
}

struct StubHasher;
impl PasswordHasher for StubHasher {
    fn hash(&self, plain: &str) -> Result<String, AuthError> { Ok(format!("hash:{plain}")) }
    fn verify(&self, plain: &str, hash: &str) -> Result<bool, AuthError> { Ok(hash == format!("hash:{plain}")) }
}

struct StubIssuer;
impl TokenIssuer for StubIssuer {
    fn issue(&self, user_id: i64, email: &str, role: &str) -> Result<String, AuthError> {
        Ok(format!("token:{user_id}:{email}:{role}"))
    }
    fn verify(&self, token: &str) -> Result<JwtClaims, AuthError> {
        let parts: Vec<&str> = token.splitn(4, ':').collect();
        if parts.len() != 4 || parts[0] != "token" { return Err(AuthError::InvalidToken); }
        Ok(JwtClaims {
            user_id: parts[1].parse().unwrap(), email: parts[2].into(),
            role: parts[3].into(), issued_at: Utc::now(), expires_at: Utc::now(),
        })
    }
}

fn make() -> AuthUseCasesImpl {
    AuthUseCasesImpl::new(Arc::new(InMemRepo::default()), Arc::new(StubHasher), Arc::new(StubIssuer))
}

#[tokio::test]
async fn first_register_succeeds_and_returns_token() {
    let uc = make();
    let (user, token) = uc.register("a@b.com".into(), "Ana".into(), "secret123".into()).await.unwrap();
    assert_eq!(user.email, "a@b.com");
    assert!(token.starts_with("token:"));
}

#[tokio::test]
async fn second_register_is_disabled() {
    let uc = make();
    uc.register("a@b.com".into(), "Ana".into(), "secret123".into()).await.unwrap();
    let err = uc.register("c@d.com".into(), "Carl".into(), "secret456".into()).await.unwrap_err();
    assert!(matches!(err, AuthError::RegistrationDisabled));
}

#[tokio::test]
async fn login_with_correct_password_succeeds() {
    let uc = make();
    uc.register("a@b.com".into(), "Ana".into(), "secret123".into()).await.unwrap();
    let (user, _) = uc.login("a@b.com".into(), "secret123".into()).await.unwrap();
    assert_eq!(user.email, "a@b.com");
}

#[tokio::test]
async fn login_with_wrong_password_fails() {
    let uc = make();
    uc.register("a@b.com".into(), "Ana".into(), "secret123".into()).await.unwrap();
    let err = uc.login("a@b.com".into(), "WRONG".into()).await.unwrap_err();
    assert!(matches!(err, AuthError::InvalidCredentials));
}

#[tokio::test]
async fn weak_password_rejected() {
    let uc = make();
    let err = uc.register("a@b.com".into(), "Ana".into(), "abc".into()).await.unwrap_err();
    assert!(matches!(err, AuthError::WeakPassword { .. }));
}
```

- [ ] **Step 3: Register the test in root `Cargo.toml`**

Append at the end of root `Cargo.toml`:
```toml
[[test]]
name = "auth_application"
path = "tests/auth_application.rs"
```

- [ ] **Step 4: Run the test to confirm failure (no impl yet)**

```bash
cargo test --test auth_application
```
Expected: compile error — `AuthUseCasesImpl` does not exist.

- [ ] **Step 5: Implement `AuthUseCasesImpl`**

Create `crates/application/src/auth_cases/cases.rs`:
```rust
use std::sync::Arc;
use async_trait::async_trait;
use domain::auth::entities::user::{NewUser, User};
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::token_issuer::TokenIssuer;
use domain::auth::outbound::user_repository::UserRepository;
use domain::auth::value_objects::claims::JwtClaims;
use domain::auth::value_objects::email::Email;
use domain::error::AuthError;

pub struct AuthUseCasesImpl {
    repo: Arc<dyn UserRepository>,
    hasher: Arc<dyn PasswordHasher>,
    issuer: Arc<dyn TokenIssuer>,
}

impl AuthUseCasesImpl {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        hasher: Arc<dyn PasswordHasher>,
        issuer: Arc<dyn TokenIssuer>,
    ) -> Self { Self { repo, hasher, issuer } }

    fn check_password_strength(password: &str) -> Result<(), AuthError> {
        if password.len() < 8 {
            return Err(AuthError::WeakPassword { reason: "must be at least 8 characters".into() });
        }
        Ok(())
    }
}

#[async_trait]
impl AuthUseCases for AuthUseCasesImpl {
    async fn register(&self, email: String, name: String, password: String)
        -> Result<(User, String), AuthError>
    {
        if self.repo.count().await? > 0 {
            return Err(AuthError::RegistrationDisabled);
        }
        Self::check_password_strength(&password)?;
        let email = Email::parse(email)?.into_string();
        if self.repo.find_by_email(&email).await?.is_some() {
            return Err(AuthError::EmailAlreadyTaken { email });
        }
        let password_hash = self.hasher.hash(&password)?;
        let user = self.repo.create(NewUser {
            email: email.clone(), name, password_hash, role: "admin".into(),
        }).await?;
        let token = self.issuer.issue(user.id, &user.email, &user.role)?;
        Ok((user, token))
    }

    async fn login(&self, email: String, password: String) -> Result<(User, String), AuthError> {
        let email = Email::parse(email)?.into_string();
        let user = self.repo.find_by_email(&email).await?
            .ok_or(AuthError::InvalidCredentials)?;
        if !self.hasher.verify(&password, &user.password_hash)? {
            return Err(AuthError::InvalidCredentials);
        }
        let token = self.issuer.issue(user.id, &user.email, &user.role)?;
        Ok((user, token))
    }

    async fn verify_token(&self, token: &str) -> Result<JwtClaims, AuthError> {
        self.issuer.verify(token)
    }

    async fn get_user(&self, user_id: i64) -> Result<User, AuthError> {
        self.repo.find_by_id(user_id).await?.ok_or(AuthError::InvalidCredentials)
    }

    async fn has_users(&self) -> Result<bool, AuthError> {
        Ok(self.repo.count().await? > 0)
    }
}
```

- [ ] **Step 6: Run the test to confirm green**

```bash
cargo test --test auth_application
```
Expected: 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add crates/application/src/auth_cases crates/application/src/lib.rs tests/auth_application.rs Cargo.toml
git commit -m "auth/application: AuthUseCasesImpl with register/login/verify"
```

---

### Task 4: Infrastructure — Argon2 hasher with TDD

**Files:**
- Create: `crates/infrastructure/src/security/{mod.rs, argon2_hasher.rs}`.
- Modify: `crates/infrastructure/src/lib.rs` (or `mod.rs`).
- Modify: `crates/infrastructure/Cargo.toml` (depend on `argon2`).
- Create: `tests/argon2_hasher.rs`.
- Modify: root `Cargo.toml` (`[[test]]`).

- [ ] **Step 1: Add `argon2` and `domain` deps to infrastructure crate**

In `crates/infrastructure/Cargo.toml`, ensure `[dependencies]` contains:
```toml
domain = { path = "../domain" }
argon2 = { workspace = true }
```

- [ ] **Step 2: Register `security` module in infrastructure**

Edit the infrastructure crate root (`lib.rs` or `mod.rs`) and add:
```rust
pub mod security;
```

Create `crates/infrastructure/src/security/mod.rs`:
```rust
pub mod argon2_hasher;
pub mod jwt_issuer;
```

- [ ] **Step 3: Write the failing hasher test**

Create `tests/argon2_hasher.rs`:
```rust
use domain::auth::outbound::password_hasher::PasswordHasher;
use infrastructure::security::argon2_hasher::Argon2Hasher;

#[test]
fn round_trip_succeeds() {
    let h = Argon2Hasher::new();
    let hash = h.hash("correcthorsebatterystaple").unwrap();
    assert!(h.verify("correcthorsebatterystaple", &hash).unwrap());
}

#[test]
fn wrong_password_fails() {
    let h = Argon2Hasher::new();
    let hash = h.hash("correcthorsebatterystaple").unwrap();
    assert!(!h.verify("wrong", &hash).unwrap());
}
```

Append to root `Cargo.toml`:
```toml
[[test]]
name = "argon2_hasher"
path = "tests/argon2_hasher.rs"
```

- [ ] **Step 4: Run to confirm failure**

```bash
cargo test --test argon2_hasher
```
Expected: compile error — type missing.

- [ ] **Step 5: Implement Argon2Hasher**

Create `crates/infrastructure/src/security/argon2_hasher.rs`:
```rust
use argon2::{Argon2, PasswordHash, PasswordHasher as Argon2PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::error::AuthError;

pub struct Argon2Hasher;

impl Argon2Hasher {
    pub fn new() -> Self { Self }
}

impl Default for Argon2Hasher {
    fn default() -> Self { Self::new() }
}

impl PasswordHasher for Argon2Hasher {
    fn hash(&self, plain: &str) -> Result<String, AuthError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let phc = argon2.hash_password(plain.as_bytes(), &salt)
            .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(phc.to_string())
    }

    fn verify(&self, plain: &str, hash: &str) -> Result<bool, AuthError> {
        let parsed = PasswordHash::new(hash)
            .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(Argon2::default().verify_password(plain.as_bytes(), &parsed).is_ok())
    }
}
```

- [ ] **Step 6: Run to confirm green**

```bash
cargo test --test argon2_hasher
```
Expected: 2 tests pass.

- [ ] **Step 7: Commit**

```bash
git add crates/infrastructure/src/security crates/infrastructure/Cargo.toml crates/infrastructure/src/lib.rs tests/argon2_hasher.rs Cargo.toml
git commit -m "infra/security: Argon2id PasswordHasher impl"
```

---

### Task 5: Infrastructure — JWT issuer with TDD

**Files:**
- Create: `crates/infrastructure/src/security/jwt_issuer.rs`.
- Modify: `crates/infrastructure/Cargo.toml` (depend on `jsonwebtoken`, `chrono`, `serde`).
- Create: `tests/jwt_issuer.rs`.
- Modify: root `Cargo.toml`.

- [ ] **Step 1: Add deps to infrastructure crate**

`crates/infrastructure/Cargo.toml` `[dependencies]`:
```toml
jsonwebtoken = { workspace = true }
serde = { workspace = true }
chrono = { workspace = true }
```

- [ ] **Step 2: Write the failing test**

Create `tests/jwt_issuer.rs`:
```rust
use domain::auth::outbound::token_issuer::TokenIssuer;
use infrastructure::security::jwt_issuer::JwtIssuer;

#[test]
fn issue_then_verify_returns_claims() {
    let issuer = JwtIssuer::new("test-secret".into(), 1);
    let token = issuer.issue(42, "ana@b.com", "admin").unwrap();
    let claims = issuer.verify(&token).unwrap();
    assert_eq!(claims.user_id, 42);
    assert_eq!(claims.email, "ana@b.com");
    assert_eq!(claims.role, "admin");
}

#[test]
fn tampered_token_rejected() {
    let issuer = JwtIssuer::new("test-secret".into(), 1);
    let token = issuer.issue(42, "ana@b.com", "admin").unwrap();
    let tampered = format!("{}x", token);
    assert!(issuer.verify(&tampered).is_err());
}

#[test]
fn wrong_secret_rejected() {
    let signer = JwtIssuer::new("a".into(), 1);
    let verifier = JwtIssuer::new("b".into(), 1);
    let token = signer.issue(42, "ana@b.com", "admin").unwrap();
    assert!(verifier.verify(&token).is_err());
}
```

Append to root `Cargo.toml`:
```toml
[[test]]
name = "jwt_issuer"
path = "tests/jwt_issuer.rs"
```

- [ ] **Step 3: Run to confirm failure**

```bash
cargo test --test jwt_issuer
```

- [ ] **Step 4: Implement JwtIssuer**

Create `crates/infrastructure/src/security/jwt_issuer.rs`:
```rust
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use domain::auth::outbound::token_issuer::TokenIssuer;
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::AuthError;

#[derive(Debug, Serialize, Deserialize)]
struct InternalClaims {
    sub: String,
    email: String,
    role: String,
    iat: i64,
    exp: i64,
}

pub struct JwtIssuer { secret: String, ttl_hours: i64 }

impl JwtIssuer {
    pub fn new(secret: String, ttl_hours: i64) -> Self { Self { secret, ttl_hours } }
}

impl TokenIssuer for JwtIssuer {
    fn issue(&self, user_id: i64, email: &str, role: &str) -> Result<String, AuthError> {
        let now = Utc::now();
        let exp = now + Duration::hours(self.ttl_hours);
        let claims = InternalClaims {
            sub: user_id.to_string(),
            email: email.to_string(),
            role: role.to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
        };
        encode(&Header::new(Algorithm::HS256), &claims, &EncodingKey::from_secret(self.secret.as_bytes()))
            .map_err(|e| AuthError::Internal { reason: e.to_string() })
    }

    fn verify(&self, token: &str) -> Result<JwtClaims, AuthError> {
        let data = decode::<InternalClaims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        ).map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::ExpiredToken,
            _ => AuthError::InvalidToken,
        })?;
        let c = data.claims;
        Ok(JwtClaims {
            user_id: c.sub.parse().map_err(|_| AuthError::InvalidToken)?,
            email: c.email,
            role: c.role,
            issued_at: chrono::DateTime::from_timestamp(c.iat, 0).ok_or(AuthError::InvalidToken)?,
            expires_at: chrono::DateTime::from_timestamp(c.exp, 0).ok_or(AuthError::InvalidToken)?,
        })
    }
}
```

- [ ] **Step 5: Run to confirm green**

```bash
cargo test --test jwt_issuer
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add crates/infrastructure/src/security/jwt_issuer.rs crates/infrastructure/Cargo.toml tests/jwt_issuer.rs Cargo.toml
git commit -m "infra/security: HS256 JwtIssuer impl"
```

---

### Task 6: Infrastructure — SqliteUserRepository with TDD

**Files:**
- Create: `crates/infrastructure/src/persistence/repositories/users_repository.rs`.
- Modify: `crates/infrastructure/src/persistence/repositories/mod.rs` (register).
- Create: `tests/users_repository.rs`.
- Modify: root `Cargo.toml`.

- [ ] **Step 1: Register module**

Edit `crates/infrastructure/src/persistence/repositories/mod.rs` and add:
```rust
pub mod users_repository;
```

- [ ] **Step 2: Write the failing test**

Create `tests/users_repository.rs`:
```rust
use std::sync::Arc;
use domain::auth::entities::user::NewUser;
use domain::auth::outbound::user_repository::UserRepository;
use infrastructure::persistence::connection::InternalDataBase;
use infrastructure::persistence::repositories::users_repository::SqliteUserRepository;

async fn fresh_db() -> Arc<InternalDataBase> {
    let db = Arc::new(InternalDataBase::new("sqlite::memory:").await.unwrap());
    sqlx::migrate!("./migrations").run(db.pool()).await.unwrap();
    db
}

#[tokio::test]
async fn create_then_find_by_email_and_id() {
    let db = fresh_db().await;
    let repo = SqliteUserRepository::new(db);
    let created = repo.create(NewUser {
        email: "a@b.com".into(), name: "Ana".into(),
        password_hash: "h".into(), role: "admin".into(),
    }).await.unwrap();
    assert!(created.id > 0);
    assert_eq!(repo.find_by_email("a@b.com").await.unwrap().unwrap().email, "a@b.com");
    assert_eq!(repo.find_by_id(created.id).await.unwrap().unwrap().id, created.id);
    assert_eq!(repo.count().await.unwrap(), 1);
}

#[tokio::test]
async fn find_unknown_returns_none() {
    let db = fresh_db().await;
    let repo = SqliteUserRepository::new(db);
    assert!(repo.find_by_email("nope@b.com").await.unwrap().is_none());
    assert!(repo.find_by_id(9999).await.unwrap().is_none());
}
```

Append to root `Cargo.toml`:
```toml
[[test]]
name = "users_repository"
path = "tests/users_repository.rs"
```

- [ ] **Step 3: Run to confirm failure**

```bash
cargo test --test users_repository
```

- [ ] **Step 4: Implement SqliteUserRepository**

Create `crates/infrastructure/src/persistence/repositories/users_repository.rs`:
```rust
use std::sync::Arc;
use async_trait::async_trait;
use chrono::{DateTime, Utc, NaiveDateTime};
use domain::auth::entities::user::{NewUser, User};
use domain::auth::outbound::user_repository::UserRepository;
use domain::error::AuthError;
use crate::persistence::connection::InternalDataBase;

pub struct SqliteUserRepository { db: Arc<InternalDataBase> }

impl SqliteUserRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self { Self { db } }
}

fn parse_dt(raw: &str) -> Result<DateTime<Utc>, AuthError> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .map(|n| n.and_utc())
        .map_err(|e| AuthError::Internal { reason: e.to_string() })
}

#[async_trait]
impl UserRepository for SqliteUserRepository {
    async fn count(&self) -> Result<i64, AuthError> {
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
            .fetch_one(self.db.pool())
            .await
            .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(row.0)
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError> {
        let row: Option<(i64, String, String, String, String, String)> = sqlx::query_as(
            "SELECT id, email, name, password_hash, role, created_at FROM users WHERE email = ?",
        )
        .bind(email)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(row.map(|(id, email, name, ph, role, ca)| User {
            id, email, name, password_hash: ph, role,
            created_at: parse_dt(&ca).unwrap_or_else(|_| Utc::now()),
        }))
    }

    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError> {
        let row: Option<(i64, String, String, String, String, String)> = sqlx::query_as(
            "SELECT id, email, name, password_hash, role, created_at FROM users WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| AuthError::Internal { reason: e.to_string() })?;
        Ok(row.map(|(id, email, name, ph, role, ca)| User {
            id, email, name, password_hash: ph, role,
            created_at: parse_dt(&ca).unwrap_or_else(|_| Utc::now()),
        }))
    }

    async fn create(&self, new_user: NewUser) -> Result<User, AuthError> {
        let result = sqlx::query(
            "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)",
        )
        .bind(&new_user.email)
        .bind(&new_user.name)
        .bind(&new_user.password_hash)
        .bind(&new_user.role)
        .execute(self.db.pool())
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("UNIQUE") {
                AuthError::EmailAlreadyTaken { email: new_user.email.clone() }
            } else { AuthError::Internal { reason: msg } }
        })?;
        let id = result.last_insert_rowid();
        self.find_by_id(id).await?.ok_or(AuthError::Internal { reason: "user not found after insert".into() })
    }
}
```

- [ ] **Step 5: Run to confirm green**

```bash
cargo test --test users_repository
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add crates/infrastructure/src/persistence/repositories tests/users_repository.rs Cargo.toml
git commit -m "infra/persistence: SqliteUserRepository"
```

---

### Task 7: Adapter — Auth API models, handlers, middleware, routers

**Files:**
- Create: `crates/adapters/src/api/auth/{mod.rs, models.rs, handlers.rs, middleware.rs, routers.rs}`.
- Modify: `crates/adapters/src/api/mod.rs` — register `auth` module.
- Modify: `crates/adapters/src/api/error.rs` — add Auth mapping.
- Modify: `crates/adapters/src/api/api_docs.rs` — add auth paths/schemas.
- Modify: `crates/adapters/Cargo.toml` if needed (`jsonwebtoken` indirectly via `domain`).

- [ ] **Step 1: Register auth module in adapters**

Edit `crates/adapters/src/api/mod.rs` and add:
```rust
pub mod auth;
```

Create `crates/adapters/src/api/auth/mod.rs`:
```rust
pub mod models;
pub mod handlers;
pub mod middleware;
pub mod routers;
```

- [ ] **Step 2: Write request/response models**

Create `crates/adapters/src/api/auth/models.rs`:
```rust
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct RegisterRequest {
    pub email: String,
    pub name: String,
    pub password: String,
}

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct UserResponse {
    pub id: i64,
    pub email: String,
    pub name: String,
    pub role: String,
}

#[derive(Serialize, ToSchema)]
pub struct AuthResponse {
    pub user: UserResponse,
    pub token: String,
}

#[derive(Serialize, ToSchema)]
pub struct HasUsersResponse {
    pub has_users: bool,
}

#[derive(Serialize, ToSchema)]
pub struct MeResponse {
    pub user: UserResponse,
}
```

- [ ] **Step 3: Write handlers**

Create `crates/adapters/src/api/auth/handlers.rs`:
```rust
use actix_web::{web, HttpRequest, HttpResponse};
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::auth::value_objects::claims::JwtClaims;
use crate::api::error::ApiError;
use super::models::*;

fn user_resp(u: &domain::auth::entities::user::User) -> UserResponse {
    UserResponse { id: u.id, email: u.email.clone(), name: u.name.clone(), role: u.role.clone() }
}

#[utoipa::path(post, path = "/auth/register", request_body = RegisterRequest,
    responses((status = 201, body = AuthResponse), (status = 403), (status = 409)))]
pub async fn register(
    body: web::Json<RegisterRequest>,
    uc: web::Data<dyn AuthUseCases + Send + Sync>,
) -> Result<HttpResponse, ApiError> {
    let body = body.into_inner();
    let (user, token) = uc.register(body.email, body.name, body.password).await
        .map_err(|e| ApiError(domain::error::IoTBeeError::AuthError(e)))?;
    Ok(HttpResponse::Created().json(AuthResponse { user: user_resp(&user), token }))
}

#[utoipa::path(post, path = "/auth/login", request_body = LoginRequest,
    responses((status = 200, body = AuthResponse), (status = 401)))]
pub async fn login(
    body: web::Json<LoginRequest>,
    uc: web::Data<dyn AuthUseCases + Send + Sync>,
) -> Result<HttpResponse, ApiError> {
    let body = body.into_inner();
    let (user, token) = uc.login(body.email, body.password).await
        .map_err(|e| ApiError(domain::error::IoTBeeError::AuthError(e)))?;
    Ok(HttpResponse::Ok().json(AuthResponse { user: user_resp(&user), token }))
}

#[utoipa::path(get, path = "/auth/has-users",
    responses((status = 200, body = HasUsersResponse)))]
pub async fn has_users(
    uc: web::Data<dyn AuthUseCases + Send + Sync>,
) -> Result<HttpResponse, ApiError> {
    let v = uc.has_users().await.map_err(|e| ApiError(domain::error::IoTBeeError::AuthError(e)))?;
    Ok(HttpResponse::Ok().json(HasUsersResponse { has_users: v }))
}

#[utoipa::path(get, path = "/auth/me",
    responses((status = 200, body = MeResponse), (status = 401)))]
pub async fn me(
    req: HttpRequest,
    uc: web::Data<dyn AuthUseCases + Send + Sync>,
) -> Result<HttpResponse, ApiError> {
    let claims = req.extensions().get::<JwtClaims>().cloned()
        .ok_or_else(|| ApiError(domain::error::IoTBeeError::AuthError(domain::error::AuthError::InvalidToken)))?;
    let user = uc.get_user(claims.user_id).await
        .map_err(|e| ApiError(domain::error::IoTBeeError::AuthError(e)))?;
    Ok(HttpResponse::Ok().json(MeResponse { user: user_resp(&user) }))
}
```

- [ ] **Step 4: Write JWT middleware**

Create `crates/adapters/src/api/auth/middleware.rs`:
```rust
use std::future::{ready, Ready};
use std::rc::Rc;
use actix_web::{
    body::EitherBody, dev::{Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, HttpResponse,
};
use futures_util::future::LocalBoxFuture;
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::error::AuthError;

pub struct JwtAuth;

impl<S, B> Transform<S, ServiceRequest> for JwtAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = JwtAuthMw<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;
    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(JwtAuthMw { service: Rc::new(service) }))
    }
}

pub struct JwtAuthMw<S> { service: Rc<S> }

impl<S, B> Service<ServiceRequest> for JwtAuthMw<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;
    actix_web::dev::forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        Box::pin(async move {
            let token = req.headers().get("Authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.strip_prefix("Bearer "));
            let Some(token) = token else {
                let resp = HttpResponse::Unauthorized().json(serde_json::json!({"error":"missing bearer"}));
                return Ok(req.into_response(resp).map_into_right_body());
            };
            let uc = req.app_data::<actix_web::web::Data<dyn AuthUseCases + Send + Sync>>().cloned();
            let Some(uc) = uc else {
                let resp = HttpResponse::InternalServerError().json(serde_json::json!({"error":"auth not wired"}));
                return Ok(req.into_response(resp).map_into_right_body());
            };
            match uc.verify_token(token).await {
                Ok(claims) => {
                    req.extensions_mut().insert(claims);
                    let res = svc.call(req).await?;
                    Ok(res.map_into_left_body())
                }
                Err(AuthError::ExpiredToken) => {
                    let resp = HttpResponse::Unauthorized().json(serde_json::json!({"error":"token expired"}));
                    Ok(req.into_response(resp).map_into_right_body())
                }
                Err(_) => {
                    let resp = HttpResponse::Unauthorized().json(serde_json::json!({"error":"invalid token"}));
                    Ok(req.into_response(resp).map_into_right_body())
                }
            }
        })
    }
}
```

- [ ] **Step 5: Write the routers (public scope, no middleware)**

Create `crates/adapters/src/api/auth/routers.rs`:
```rust
use actix_web::{web, Scope};
use domain::auth::inbound::auth_uses::AuthUseCases;
use super::handlers;

pub fn auth_scope(uc: web::Data<dyn AuthUseCases + Send + Sync>) -> Scope {
    web::scope("/auth")
        .app_data(uc)
        .route("/register", web::post().to(handlers::register))
        .route("/login", web::post().to(handlers::login))
        .route("/has-users", web::get().to(handlers::has_users))
        .route("/me", web::get().to(handlers::me))
}
```

- [ ] **Step 6: Extend `ApiError` mapping**

Edit `crates/adapters/src/api/error.rs`. In `impl ResponseError for ApiError::status_code`, add:
```rust
            IoTBeeError::AuthError(inner) => match inner {
                AuthError::InvalidCredentials | AuthError::InvalidToken | AuthError::ExpiredToken => StatusCode::UNAUTHORIZED,
                AuthError::EmailAlreadyTaken { .. } => StatusCode::CONFLICT,
                AuthError::RegistrationDisabled => StatusCode::FORBIDDEN,
                AuthError::WeakPassword { .. } => StatusCode::BAD_REQUEST,
                AuthError::Internal { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            },
```

In `error_response`, add a matching branch returning `HttpResponse::build(self.status_code()).json(ErrorResponse { error: e.to_string() })`. Add `use domain::error::AuthError;` at top.

- [ ] **Step 7: Add /auth paths and schemas to OpenAPI**

In `crates/adapters/src/api/api_docs.rs` add to `paths(...)`:
```rust
        crate::api::auth::handlers::register,
        crate::api::auth::handlers::login,
        crate::api::auth::handlers::has_users,
        crate::api::auth::handlers::me,
```

And to `components(schemas(...))`:
```rust
        crate::api::auth::models::RegisterRequest,
        crate::api::auth::models::LoginRequest,
        crate::api::auth::models::AuthResponse,
        crate::api::auth::models::UserResponse,
        crate::api::auth::models::HasUsersResponse,
        crate::api::auth::models::MeResponse,
```

- [ ] **Step 8: Compile-check adapters**

```bash
cargo check -p adapters
```
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add crates/adapters/src/api/auth crates/adapters/src/api/mod.rs crates/adapters/src/api/error.rs crates/adapters/src/api/api_docs.rs
git commit -m "adapters/auth: handlers, JWT middleware, routers, OpenAPI"
```

---

### Task 8: Composition — wire auth, CORS, and protect existing routes

**Files:**
- Modify: `src/config.rs`.
- Modify: `src/composition/app_state.rs`.
- Modify: `src/composition/api_composition/api_composer.rs`.
- Modify: `Cargo.toml` (root) — depend on `actix-cors`.

- [ ] **Step 1: Add `actix-cors` to root `Cargo.toml`**

In root `Cargo.toml` `[dependencies]`:
```toml
actix-cors = "0.7"
```

- [ ] **Step 2: Extend `Config`**

Edit `src/config.rs`. Add fields and parse them:
```rust
    pub jwt_secret: String,
    pub jwt_expires_in_hours: i64,
    pub cors_origins: Vec<String>,
```

In `get_or_init`:
```rust
    jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET requerida"),
    jwt_expires_in_hours: env::var("JWT_EXPIRES_IN_HOURS")
        .ok().and_then(|s| s.parse().ok()).unwrap_or(24),
    cors_origins: env::var("CORS_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000".into())
        .split(',').map(|s| s.trim().to_string()).collect(),
```

- [ ] **Step 3: Add `auth_app_state()` to `AppState`**

Edit `src/composition/app_state.rs` add imports:
```rust
use application::auth_cases::cases::AuthUseCasesImpl;
use domain::auth::inbound::auth_uses::AuthUseCases;
use infrastructure::persistence::repositories::users_repository::SqliteUserRepository;
use infrastructure::security::argon2_hasher::Argon2Hasher;
use infrastructure::security::jwt_issuer::JwtIssuer;
```

Add method:
```rust
pub fn auth_app_state(&self) -> web::Data<dyn AuthUseCases + Send + Sync> {
    let repo = Arc::new(SqliteUserRepository::new(self.internal_data_base.clone()));
    let hasher = Arc::new(Argon2Hasher::new());
    let issuer = Arc::new(JwtIssuer::new(
        self.config.jwt_secret.clone(),
        self.config.jwt_expires_in_hours,
    ));
    let uc: Arc<dyn AuthUseCases + Send + Sync> = Arc::new(AuthUseCasesImpl::new(repo, hasher, issuer));
    web::Data::from(uc)
}
```

- [ ] **Step 4: Wire auth scope, CORS, and JWT middleware in `api_composer.rs`**

Edit `src/composition/api_composition/api_composer.rs`. Add imports:
```rust
use actix_cors::Cors;
use adapters::api::auth::routers::auth_scope;
use adapters::api::auth::middleware::JwtAuth;
```

In `run`, before `HttpServer::new`:
```rust
let auth = app_state.auth_app_state();
let cors_origins = app_state.config.cors_origins.clone();
```

In the `App::new()` chain, wrap the protected scopes inside a guarded scope and add CORS:
```rust
HttpServer::new(move || {
    let mut cors = Cors::default()
        .allow_any_method()
        .allow_any_header()
        .max_age(3600);
    for o in cors_origins.iter() {
        cors = cors.allowed_origin(o);
    }
    App::new()
        .wrap(cors)
        .service(SwaggerUi::new("/swagger-ui/{_:.*}").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .service(auth_scope(auth.clone()))
        .service(
            web::scope("")
                .app_data(auth.clone())
                .wrap(JwtAuth)
                .service(connection_types_scope())
                .service(validation_schemas_scope(validation_schemas.clone()))
                .service(data_sources_scope(data_sources.clone()))
                .service(pipeline_groups_scope(pipeline_groups.clone()))
                .service(data_store_scope(data_stores.clone()))
                .service(pipeline_data_scope(pipeline_data.clone()))
                .service(pipeline_lifecycle_scope(pipeline_lifecycle.clone()))
        )
})
```

Note: `auth.clone()` is added as `app_data` on the protected scope so the middleware can resolve the `AuthUseCases` data.

- [ ] **Step 5: Update `.env` example**

Edit (or create) `/Users/ovidio/Documents/iot-bee/.env.example`:
```
DATABASE_URL=sqlite://data/iot-bee.db
API_HOST=127.0.0.1
API_PORT=8080
RUST_LOG=info
JWT_SECRET=change-me-in-production-this-must-be-long-and-random
JWT_EXPIRES_IN_HOURS=24
CORS_ORIGINS=http://localhost:3000
```

Update README "Configuration" table to include the three new vars.

- [ ] **Step 6: Compile and run**

```bash
JWT_SECRET=devsecret cargo check
```
Expected: clean. Then a smoke run:
```bash
JWT_SECRET=devsecret cargo run
```
Verify the banner prints; ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add Cargo.toml src/config.rs src/composition .env.example README.md
git commit -m "composition: wire auth, CORS, JWT middleware on protected scopes"
```

---

### Task 9: Adapter integration test for /auth + middleware

**Files:**
- Create: `tests/auth_api.rs`.
- Modify: root `Cargo.toml`.

- [ ] **Step 1: Write the failing integration test**

Create `tests/auth_api.rs`:
```rust
use actix_web::{test, web, App};
use actix_web::http::StatusCode;
use serde_json::json;
use std::sync::Arc;
use adapters::api::auth::{routers::auth_scope, middleware::JwtAuth};
use adapters::api::data_sources::routers::data_sources_scope;
use application::auth_cases::cases::AuthUseCasesImpl;
use application::data_sources_cases::cases::{DataSourcesUseCases, DataSourcesUseCasesImpl};
use domain::auth::inbound::auth_uses::AuthUseCases;
use infrastructure::persistence::connection::InternalDataBase;
use infrastructure::persistence::repositories::data_source_repository::DataSourceRepository;
use infrastructure::persistence::repositories::users_repository::SqliteUserRepository;
use infrastructure::security::argon2_hasher::Argon2Hasher;
use infrastructure::security::jwt_issuer::JwtIssuer;

async fn fresh_db() -> Arc<InternalDataBase> {
    let db = Arc::new(InternalDataBase::new("sqlite::memory:").await.unwrap());
    sqlx::migrate!("./migrations").run(db.pool()).await.unwrap();
    db
}

fn auth_data(db: Arc<InternalDataBase>) -> web::Data<dyn AuthUseCases + Send + Sync> {
    let repo = Arc::new(SqliteUserRepository::new(db));
    let hasher = Arc::new(Argon2Hasher::new());
    let issuer = Arc::new(JwtIssuer::new("test".into(), 1));
    let uc: Arc<dyn AuthUseCases + Send + Sync> = Arc::new(AuthUseCasesImpl::new(repo, hasher, issuer));
    web::Data::from(uc)
}

fn ds_data(db: Arc<InternalDataBase>) -> web::Data<dyn DataSourcesUseCases + Send + Sync> {
    let repo = Arc::new(DataSourceRepository::new(db));
    let uc: Arc<dyn DataSourcesUseCases + Send + Sync> = Arc::new(DataSourcesUseCasesImpl::new(repo));
    web::Data::from(uc)
}

#[actix_web::test]
async fn first_register_then_me_works() {
    let db = fresh_db().await;
    let auth = auth_data(db.clone());
    let app = test::init_service(
        App::new().service(auth_scope(auth.clone()))
    ).await;
    let req = test::TestRequest::post().uri("/auth/register").set_json(json!({
        "email": "a@b.com", "name": "Ana", "password": "secret123"
    })).to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::CREATED);
    let body: serde_json::Value = test::read_body_json(resp).await;
    let token = body["token"].as_str().unwrap().to_string();

    let req = test::TestRequest::get().uri("/auth/me")
        .insert_header(("Authorization", format!("Bearer {token}")))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);
}

#[actix_web::test]
async fn second_register_returns_403() {
    let db = fresh_db().await;
    let auth = auth_data(db.clone());
    let app = test::init_service(App::new().service(auth_scope(auth.clone()))).await;
    for body in [json!({"email":"a@b.com","name":"A","password":"secret123"}),
                 json!({"email":"c@d.com","name":"C","password":"secret789"})] {
        let req = test::TestRequest::post().uri("/auth/register").set_json(body).to_request();
        let _ = test::call_service(&app, req).await;
    }
    let req = test::TestRequest::post().uri("/auth/register").set_json(json!({
        "email":"e@f.com","name":"E","password":"secret789"
    })).to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::FORBIDDEN);
}

#[actix_web::test]
async fn protected_route_without_token_is_401() {
    let db = fresh_db().await;
    let auth = auth_data(db.clone());
    let app = test::init_service(
        App::new()
            .service(auth_scope(auth.clone()))
            .service(
                web::scope("").app_data(auth.clone()).wrap(JwtAuth)
                    .service(data_sources_scope(ds_data(db.clone())))
            )
    ).await;
    let req = test::TestRequest::get().uri("/data-sources").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[actix_web::test]
async fn protected_route_with_valid_token_passes_middleware() {
    let db = fresh_db().await;
    let auth = auth_data(db.clone());
    let app = test::init_service(
        App::new()
            .service(auth_scope(auth.clone()))
            .service(
                web::scope("").app_data(auth.clone()).wrap(JwtAuth)
                    .service(data_sources_scope(ds_data(db.clone())))
            )
    ).await;
    let req = test::TestRequest::post().uri("/auth/register").set_json(json!({
        "email":"a@b.com","name":"A","password":"secret123"
    })).to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    let token = body["token"].as_str().unwrap().to_string();
    let req = test::TestRequest::get().uri("/data-sources")
        .insert_header(("Authorization", format!("Bearer {token}"))).to_request();
    let resp = test::call_service(&app, req).await;
    assert!(resp.status().is_success() || resp.status() == StatusCode::OK);
}
```

Append to root `Cargo.toml`:
```toml
[[test]]
name = "auth_api"
path = "tests/auth_api.rs"
```

- [ ] **Step 2: Run all tests**

```bash
JWT_SECRET=devsecret cargo test
```
Expected: all `[[test]]` binaries green, including the four new auth_api tests.

- [ ] **Step 3: Run clippy**

```bash
cargo clippy --workspace -- -D warnings
```
Expected: clean.

- [ ] **Step 4: Commit and tag end of Phase 1**

```bash
git add tests/auth_api.rs Cargo.toml
git commit -m "auth: integration tests for /auth and JwtAuth middleware"
git tag phase-1-auth-backend
```

---

## Phase 2 — Web Scaffold + Design System

### Task 10: Scaffold Next.js project under `web/`

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/next.config.mjs`, `web/postcss.config.mjs`, `web/tailwind.config.ts`, `web/.eslintrc.json`, `web/.env.local.example`, `web/app/layout.tsx`, `web/app/page.tsx`, `web/app/globals.css`.

- [ ] **Step 1: Confirm pnpm is installed**

```bash
pnpm --version
```
Expected: a version string. If missing: `npm install -g pnpm`.

- [ ] **Step 2: Initialize the project skeleton manually (don't run `create-next-app` — we want full control)**

Create `web/package.json`:
```json
{
  "name": "iot-bee-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "gen:api": "openapi-typescript http://localhost:8080/api-docs/openapi.json -o lib/api/types.generated.ts"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-query-devtools": "^5.59.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.8",
    "zustand": "^5.0.1",
    "cmdk": "^1.0.4",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@types/node": "^22.7.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0",
    "eslint": "^9.13.0",
    "eslint-config-next": "15.0.3",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.47",
    "vitest": "^2.1.0",
    "@vitejs/plugin-react": "^4.3.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1",
    "msw": "^2.6.0",
    "@playwright/test": "^1.48.0",
    "openapi-typescript": "^7.4.0"
  }
}
```

Create `web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `web/next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
};
export default nextConfig;
```

Create `web/postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

Create `web/tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

Create `web/.eslintrc.json`:
```json
{ "extends": ["next/core-web-vitals", "next/typescript"] }
```

Create `web/.env.local.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
AUTH_COOKIE_NAME=iot_bee_session
AUTH_COOKIE_MAX_AGE_HOURS=24
INTERNAL_API_URL=http://localhost:8080
```

- [ ] **Step 3: Install deps**

```bash
cd web && pnpm install
```
Expected: a lockfile created, no install errors.

- [ ] **Step 4: Add `web/next-env.d.ts` (auto-generated by `next dev`, but pre-create empty so types pass before first run)**

```ts
/// <reference types="next" />
/// <reference types="next/types/global" />
```

- [ ] **Step 5: Verify typecheck on empty project**

```bash
cd web && pnpm typecheck
```
Expected: no files yet to check — pass.

- [ ] **Step 6: Commit**

```bash
git add web/.eslintrc.json web/.env.local.example web/next-env.d.ts web/next.config.mjs web/package.json web/pnpm-lock.yaml web/postcss.config.mjs web/tailwind.config.ts web/tsconfig.json
git commit -m "web: scaffold Next.js 15 project skeleton"
```

---

### Task 11: Design tokens (CSS variables) and global styles

**Files:**
- Create: `web/app/globals.css`, `web/app/layout.tsx`.

- [ ] **Step 1: Write `web/app/globals.css` with brutalist tokens**

```css
@import "tailwindcss";

@theme {
  --color-bg-base: #0A0A0A;
  --color-bg-panel: #0D0D0D;
  --color-bg-elev: #1A1A1A;
  --color-accent: #00FF88;
  --color-accent-dim: #00CC6A;
  --color-danger: #FF5E5E;
  --color-warn: #FFB800;
  --color-fg-0: #FFFFFF;
  --color-fg-1: #E8E8E8;
  --color-fg-2: #CCCCCC;
  --color-fg-3: #888888;
  --color-fg-4: #555555;

  --font-mono: "JetBrains Mono", "Geist Mono", ui-monospace, "Courier New", monospace;

  --radius-sm: 2px;
  --radius-md: 3px;
  --radius-lg: 6px;
}

:root { color-scheme: dark; }

html, body {
  background: var(--color-bg-base);
  color: var(--color-fg-1);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

*::selection { background: var(--color-accent); color: var(--color-bg-base); }

/* Type tokens */
.t-display  { font-size: 36px; line-height: 1; letter-spacing: -2px; color: var(--color-fg-0); font-weight: 700; }
.t-title    { font-size: 22px; line-height: 1.1; letter-spacing: -1px; color: var(--color-fg-0); font-weight: 600; }
.t-section  { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: var(--color-accent); }
.t-body     { font-size: 13px; line-height: 1.55; color: var(--color-fg-2); }
.t-mono     { font-size: 12px; color: var(--color-fg-3); }
.t-label    { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--color-fg-3); }

/* Scrollbar (brutalist) */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--color-bg-base); }
::-webkit-scrollbar-thumb { background: #1f1f1f; }
::-webkit-scrollbar-thumb:hover { background: var(--color-accent-dim); }
```

- [ ] **Step 2: Write `web/app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "iot-bee // self-hosted iot pipelines",
  description: "Rust-based ingestion pipelines for IoT data. RabbitMQ, MQTT, Kafka in. InfluxDB out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Write a tiny placeholder `web/app/page.tsx` to verify the dev server**

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="t-display">ingest. <span style={{ color: "var(--color-accent)" }}>validate.</span> persist.</h1>
    </main>
  );
}
```

- [ ] **Step 4: Run dev server and smoke test**

```bash
cd web && pnpm dev
```
Open `http://localhost:3000` in a browser. Expected: black page with neon-green-accented title. Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add web/app
git commit -m "web/design-system: tokens, type scale, placeholder home"
```

---

### Task 12: Base UI components — Button, Pill, Input, Panel, Toast

**Files:**
- Create: `web/components/ui/Button.tsx`, `Pill.tsx`, `Input.tsx`, `Panel.tsx`, `FormField.tsx`, `Toast.tsx`, `EmptyState.tsx`, `Table.tsx`.
- Create: `web/lib/cn.ts`.
- Create: `web/components/ui/__tests__/Button.test.tsx`, `Pill.test.tsx`.
- Create: `web/vitest.config.ts`, `web/test/setup.ts`.

- [ ] **Step 1: Setup vitest config**

Create `web/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
    css: false,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

Create `web/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Write the `cn` helper**

Create `web/lib/cn.ts`:
```ts
import clsx, { type ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) { return clsx(inputs); }
```

- [ ] **Step 3: Write the failing Button test**

Create `web/components/ui/__tests__/Button.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "../Button";

describe("Button", () => {
  it("renders children and default variant", () => {
    render(<Button>NEW</Button>);
    expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
  });
  it("applies the variant class", () => {
    render(<Button variant="danger">delete</Button>);
    expect(screen.getByRole("button").className).toMatch(/danger/);
  });
  it("supports the disabled state", () => {
    render(<Button disabled>x</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 4: Run test to confirm failure**

```bash
cd web && pnpm test
```
Expected: cannot find `../Button`.

- [ ] **Step 5: Implement Button**

Create `web/components/ui/Button.tsx`:
```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base = "font-mono text-[12px] tracking-[1px] px-4 py-[9px] rounded-[2px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold border border-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] hover:border-[var(--color-accent-dim)]",
  ghost: "bg-transparent text-[var(--color-fg-1)] border border-[#333] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
  danger: "bg-transparent text-[var(--color-danger)] border border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg-base)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", className, ...rest }, ref,
) {
  return <button ref={ref} data-variant={variant} className={cn(base, variants[variant], className)} {...rest} />;
});
```

- [ ] **Step 6: Run tests to confirm green**

```bash
cd web && pnpm test
```
Expected: 3 Button tests pass.

- [ ] **Step 7: Implement Pill + test**

Create `web/components/ui/__tests__/Pill.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Pill } from "../Pill";
describe("Pill", () => {
  it("renders running state", () => {
    render(<Pill state="running">RUNNING</Pill>);
    expect(screen.getByText("RUNNING")).toBeInTheDocument();
  });
});
```

Create `web/components/ui/Pill.tsx`:
```tsx
import { cn } from "@/lib/cn";

export type PillState = "running" | "error" | "idle" | "starting";

const colors: Record<PillState, string> = {
  running: "text-[var(--color-accent)] border-[var(--color-accent)]",
  error:   "text-[var(--color-danger)] border-[var(--color-danger)]",
  idle:    "text-[var(--color-fg-3)] border-[#555]",
  starting:"text-[var(--color-warn)] border-[var(--color-warn)]",
};

export function Pill({ state, children }: { state: PillState; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] tracking-[1.5px] px-2 py-0.5 border rounded-[2px]", colors[state])}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
```

- [ ] **Step 8: Implement Input + FormField (no tests; trivial passthrough)**

Create `web/components/ui/Input.tsx`:
```tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input ref={ref} className={cn(
        "block w-full bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] outline-none focus:border-[var(--color-accent)]",
        className,
      )} {...rest} />
    );
  },
);
```

Create `web/components/ui/FormField.tsx`:
```tsx
import { cn } from "@/lib/cn";

export function FormField({ label, hint, error, children, className }: {
  label: string; hint?: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("mb-3.5", className)}>
      <div className="t-label mb-1">// {label}</div>
      {children}
      {hint && !error && <div className="text-[10px] text-[var(--color-fg-4)] mt-1">{hint}</div>}
      {error && <div className="text-[10px] text-[var(--color-danger)] mt-1">× {error}</div>}
    </div>
  );
}
```

- [ ] **Step 9: Implement Panel, EmptyState, Table**

Create `web/components/ui/Panel.tsx`:
```tsx
import { cn } from "@/lib/cn";
type Tone = "default" | "accent" | "danger";
const tones: Record<Tone, string> = {
  default: "border-[#1f1f1f]",
  accent: "border-[#1f1f1f] border-l-2 border-l-[var(--color-accent)]",
  danger: "border-[#1f1f1f] border-l-2 border-l-[var(--color-danger)]",
};
export function Panel({ tone = "default", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <div className={cn("bg-[var(--color-bg-panel)] border p-4 rounded-[3px]", tones[tone], className)}>{children}</div>;
}
```

Create `web/components/ui/EmptyState.tsx`:
```tsx
import { Button } from "./Button";
export function EmptyState({ message, ctaLabel, onCta }: { message: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="t-mono mb-4">// {message}</div>
      {ctaLabel && <Button variant="primary" onClick={onCta}>{ctaLabel}</Button>}
    </div>
  );
}
```

Create `web/components/ui/Table.tsx`:
```tsx
import { cn } from "@/lib/cn";
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={cn("w-full text-[11px] font-mono", className)}>{children}</table>;
}
export function THead({ children }: { children: React.ReactNode }) {
  return <thead><tr className="text-[var(--color-accent)] text-left">{children}</tr></thead>;
}
export function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("border-b border-[var(--color-accent)] px-2 py-2 font-normal tracking-[1.5px]", className)}>{children}</th>;
}
export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("hover:bg-[var(--color-bg-elev)]", className)}>{children}</tr>;
}
export function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-dashed border-[#1f1f1f] px-2 py-2 text-[var(--color-fg-2)]", className)}>{children}</td>;
}
```

- [ ] **Step 10: Implement Toast (uses zustand store from later task; create the visual component now, store next phase)**

Create `web/components/ui/Toast.tsx`:
```tsx
"use client";
import { cn } from "@/lib/cn";
export function Toast({ kind, message }: { kind: "error" | "success" | "info"; message: string }) {
  const color = kind === "error" ? "border-[var(--color-danger)] text-[var(--color-danger)]"
               : kind === "success" ? "border-[var(--color-accent)] text-[var(--color-accent)]"
               : "border-[#333] text-[var(--color-fg-1)]";
  const prefix = kind === "error" ? "×" : kind === "success" ? "✓" : "//";
  return <div className={cn("bg-[var(--color-bg-panel)] border px-3 py-2 text-[12px] font-mono rounded-[2px]", color)}>{prefix} {message}</div>;
}
```

- [ ] **Step 11: Run tests + typecheck**

```bash
cd web && pnpm test && pnpm typecheck
```
Expected: green on both.

- [ ] **Step 12: Commit and tag end of Phase 2**

```bash
git add web/
git commit -m "web/ui: Button, Pill, Input, FormField, Panel, EmptyState, Table, Toast"
git tag phase-2-web-scaffold
```

---

## Phase 3 — Auth pages + API client + session

### Task 13: API client and Auth endpoints module

**Files:**
- Create: `web/lib/api/client.ts`, `web/lib/api/endpoints/auth.ts`, `web/lib/api/types.ts`.

- [ ] **Step 1: Write `lib/api/client.ts`**

```ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

type Init = RequestInit & { token?: string };

export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = body?.error ?? `request failed (${res.status})`;
    throw new ApiError(res.status, body?.code ?? "unknown", message);
  }
  return body as T;
}
```

- [ ] **Step 2: Write `lib/api/types.ts`**

```ts
export interface UserResponse { id: number; email: string; name: string; role: string; }
export interface AuthResponse { user: UserResponse; token: string; }
export interface HasUsersResponse { has_users: boolean; }
export interface MeResponse { user: UserResponse; }
```

- [ ] **Step 3: Write `lib/api/endpoints/auth.ts`**

```ts
import { api } from "../client";
import type { AuthResponse, HasUsersResponse, MeResponse } from "../types";

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, name: string, password: string) =>
    api<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, name, password }) }),
  hasUsers: () => api<HasUsersResponse>("/auth/has-users"),
  me: (token: string) => api<MeResponse>("/auth/me", { token }),
};
```

- [ ] **Step 4: Compile**

```bash
cd web && pnpm typecheck
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add web/lib
git commit -m "web/api: client wrapper, ApiError, auth endpoints"
```

---

### Task 14: Next route handlers that translate cookie ↔ Bearer

**Files:**
- Create: `web/app/api/auth/login/route.ts`, `register/route.ts`, `logout/route.ts`.
- Create: `web/lib/auth/session.ts`.

- [ ] **Step 1: Write `lib/auth/session.ts`**

```ts
import { cookies } from "next/headers";

const COOKIE = process.env.AUTH_COOKIE_NAME ?? "iot_bee_session";
const MAX_AGE_HOURS = Number(process.env.AUTH_COOKIE_MAX_AGE_HOURS ?? 24);

export async function getToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value ?? null;
}

export function buildSessionCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_HOURS * 60 * 60,
  };
}

export function clearSessionCookie() {
  return { name: COOKIE, value: "", maxAge: 0, path: "/" };
}
```

- [ ] **Step 2: Login route handler**

Create `web/app/api/auth/login/route.ts`:
```ts
import { NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/client";
import { buildSessionCookie } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const { user, token } = await authApi.login(email, password);
    const res = NextResponse.json({ user });
    res.cookies.set(buildSessionCookie(token));
    return res;
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Register route handler**

Create `web/app/api/auth/register/route.ts`:
```ts
import { NextResponse } from "next/server";
import { authApi } from "@/lib/api/endpoints/auth";
import { ApiError } from "@/lib/api/client";
import { buildSessionCookie } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json();
    const { user, token } = await authApi.register(email, name, password);
    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set(buildSessionCookie(token));
    return res;
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Logout route handler**

Create `web/app/api/auth/logout/route.ts`:
```ts
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearSessionCookie());
  return res;
}
```

- [ ] **Step 5: Commit**

```bash
git add web/app/api/auth web/lib/auth
git commit -m "web/auth: cookie-issuing route handlers"
```

---

### Task 15: Next middleware that gates `(app)/*`

**Files:**
- Create: `web/middleware.ts`.

- [ ] **Step 1: Write `middleware.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";

const COOKIE = process.env.AUTH_COOKIE_NAME ?? "iot_bee_session";

const PROTECTED_PREFIXES = ["/pipelines", "/sources", "/stores", "/schemas", "/groups", "/settings"];
const PROTECTED_ROOTS = new Set(["/"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
    || (PROTECTED_ROOTS.has(pathname) && req.nextUrl.searchParams.get("app") === "1");
  if (!isProtected) return NextResponse.next();
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
```

> **Note for implementer:** The marketing landing is `/`, and the protected overview lives at `/app` (we'll create that route in Phase 4). Adjust `PROTECTED_PREFIXES` to add `/app` once that route exists.

Edit immediately: add `"/app"` to `PROTECTED_PREFIXES`:
```ts
const PROTECTED_PREFIXES = ["/app", "/pipelines", "/sources", "/stores", "/schemas", "/groups", "/settings"];
```

- [ ] **Step 2: Commit**

```bash
git add web/middleware.ts
git commit -m "web: middleware gating /app and module routes"
```

---

### Task 16: Login + first-admin Register pages

**Files:**
- Create: `web/app/(auth)/layout.tsx`, `web/app/(auth)/login/page.tsx`, `web/lib/schemas/auth.ts`.

- [ ] **Step 1: Write the zod schemas**

Create `web/lib/schemas/auth.ts`:
```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("must be a valid email"),
  password: z.string().min(8, "must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = loginSchema.extend({
  name: z.string().min(1, "name is required"),
});
export type RegisterInput = z.infer<typeof registerSchema>;
```

- [ ] **Step 2: Write the auth layout**

Create `web/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="t-label mb-6">// iot-bee</div>
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Write the login/first-admin page**

Create `web/app/(auth)/login/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { authApi } from "@/lib/api/endpoints/auth";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "@/lib/schemas/auth";

type Mode = "loading" | "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("loading");
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/app";

  useEffect(() => {
    authApi.hasUsers().then((r) => setMode(r.has_users ? "login" : "register")).catch(() => setMode("login"));
  }, []);

  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onLogin(values: LoginInput) {
    setServerError(null);
    const res = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify(values), headers: { "Content-Type": "application/json" } });
    if (!res.ok) { setServerError((await res.json()).error ?? "login failed"); return; }
    router.push(nextPath);
  }
  async function onRegister(values: RegisterInput) {
    setServerError(null);
    const res = await fetch("/api/auth/register", { method: "POST", body: JSON.stringify(values), headers: { "Content-Type": "application/json" } });
    if (!res.ok) { setServerError((await res.json()).error ?? "register failed"); return; }
    router.push(nextPath);
  }

  if (mode === "loading") return <div className="t-mono">// loading…</div>;

  if (mode === "register") return (
    <form onSubmit={registerForm.handleSubmit(onRegister)}>
      <h1 className="t-title mb-1">create admin account</h1>
      <p className="t-mono mb-6">// no users yet — this account becomes the only admin.</p>
      <FormField label="EMAIL" error={registerForm.formState.errors.email?.message}>
        <Input {...registerForm.register("email")} placeholder="you@host" />
      </FormField>
      <FormField label="NAME" error={registerForm.formState.errors.name?.message}>
        <Input {...registerForm.register("name")} placeholder="ovidio" />
      </FormField>
      <FormField label="PASSWORD" error={registerForm.formState.errors.password?.message}>
        <Input type="password" {...registerForm.register("password")} placeholder="≥ 8 chars" />
      </FormField>
      {serverError && <div className="text-[10px] text-[var(--color-danger)] mb-3">× {serverError}</div>}
      <div className="flex gap-3 items-center">
        <Button type="submit" variant="primary">+ CREATE ADMIN</Button>
      </div>
    </form>
  );

  return (
    <form onSubmit={loginForm.handleSubmit(onLogin)}>
      <h1 className="t-title mb-1">login</h1>
      <p className="t-mono mb-6">// $ auth login</p>
      <FormField label="EMAIL" error={loginForm.formState.errors.email?.message}>
        <Input {...loginForm.register("email")} placeholder="you@host" autoFocus />
      </FormField>
      <FormField label="PASSWORD" error={loginForm.formState.errors.password?.message}>
        <Input type="password" {...loginForm.register("password")} />
      </FormField>
      {serverError && <div className="text-[10px] text-[var(--color-danger)] mb-3">× {serverError}</div>}
      <div className="flex gap-3 items-center">
        <Button type="submit" variant="primary">▸ LOGIN</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Smoke**

Backend running with `JWT_SECRET=devsecret`, then `cd web && pnpm dev`. Open `http://localhost:3000/login`. With an empty database, expect "create admin account". Create the admin; expect redirect to `/app` (404 for now — Phase 4 builds it).

- [ ] **Step 5: Commit and tag end of Phase 3**

```bash
git add web/app/(auth) web/lib/schemas
git commit -m "web/auth: login + first-admin register pages wired"
git tag phase-3-auth-frontend
```

---

## Phase 4 — App shell, command bar, dashboard, lifecycle

### Task 17: Server-side fetch helper + React Query providers

**Files:**
- Create: `web/lib/api/server.ts`, `web/components/providers/QueryProvider.tsx`, `web/components/providers/ToastProvider.tsx`.
- Create: `web/lib/store/useToasts.ts`, `web/lib/store/useCommandBar.ts`.

- [ ] **Step 1: Server-side authenticated fetch**

Create `web/lib/api/server.ts`:
```ts
import { getToken } from "@/lib/auth/session";
import { api } from "./client";

export async function apiAuthed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("no session token");
  return api<T>(path, { ...init, token });
}
```

- [ ] **Step 2: zustand stores**

Create `web/lib/store/useToasts.ts`:
```ts
import { create } from "zustand";
type Toast = { id: string; kind: "error" | "success" | "info"; message: string };
type S = { toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: string) => void };
export const useToasts = create<S>((set) => ({
  toasts: [],
  push: (t) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
```

Create `web/lib/store/useCommandBar.ts`:
```ts
import { create } from "zustand";
type S = { open: boolean; query: string; setOpen: (v: boolean) => void; setQuery: (v: string) => void };
export const useCommandBar = create<S>((set) => ({
  open: false, query: "",
  setOpen: (open) => set({ open }),
  setQuery: (query) => set({ query }),
}));
```

- [ ] **Step 3: Providers**

Create `web/components/providers/QueryProvider.tsx`:
```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

Create `web/components/providers/ToastProvider.tsx`:
```tsx
"use client";
import { useToasts } from "@/lib/store/useToasts";
import { Toast } from "@/components/ui/Toast";

export function ToastProvider() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-[360px]">
      {toasts.map((t) => <Toast key={t.id} kind={t.kind} message={t.message} />)}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/lib/api/server.ts web/lib/store web/components/providers
git commit -m "web: server fetch helper, query/toast providers, command-bar/toasts stores"
```

---

### Task 18: AppShell — TopNav, CommandBar, Footer

**Files:**
- Create: `web/components/shell/TopNav.tsx`, `CommandBar.tsx`, `Footer.tsx`, `AppShell.tsx`.

- [ ] **Step 1: TopNav**

Create `web/components/shell/TopNav.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/app", label: "overview" },
  { href: "/pipelines", label: "pipelines" },
  { href: "/sources", label: "sources" },
  { href: "/stores", label: "stores" },
  { href: "/schemas", label: "schemas" },
  { href: "/groups", label: "groups" },
];

export function TopNav({ userName }: { userName?: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="bg-[#050505] border-b border-[var(--color-accent)] px-4 py-2.5 flex items-center gap-5 text-[11px] font-mono">
      <Link href="/app" className="text-[var(--color-accent)] font-bold tracking-[2px]">iot-bee //</Link>
      <nav className="flex gap-4 overflow-x-auto">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href}
            className={cn("text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]", path?.startsWith(t.href) && "text-[var(--color-fg-0)] border-b border-[var(--color-accent)] pb-[2px]")}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-[10px] text-[var(--color-fg-3)]">
        <span className="text-[var(--color-accent)]">●</span><span>api up</span>
        <span>{userName ?? "—"}</span>
        <button onClick={logout} className="hover:text-[var(--color-danger)]">logout</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: CommandBar (cmdk-powered)**

Create `web/components/shell/CommandBar.tsx`:
```tsx
"use client";
import { Command } from "cmdk";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCommandBar } from "@/lib/store/useCommandBar";
import { useQuery, useMutation } from "@tanstack/react-query";

export function CommandBar() {
  const { open, setOpen, query, setQuery } = useCommandBar();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(!open); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full bg-[var(--color-bg-panel)] border-b border-[#1f1f1f] px-4 py-2 text-left text-[11px] font-mono text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]">
        <span className="text-[var(--color-accent)] mr-2">$</span>
        run, navigate, search…
        <span className="float-right border border-[#333] px-1.5 text-[9px]">⌘K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-start justify-center pt-24">
      <Command className="bg-[var(--color-bg-panel)] border border-[var(--color-accent)] w-[600px] max-w-[90vw] rounded-[3px] overflow-hidden">
        <Command.Input value={query} onValueChange={setQuery} placeholder="type a command…"
          className="w-full bg-transparent text-[var(--color-fg-1)] px-4 py-3 text-[13px] font-mono outline-none" />
        <Command.List className="max-h-[320px] overflow-y-auto p-2">
          <Command.Empty className="p-3 text-[var(--color-fg-3)] text-[12px]">// no matches</Command.Empty>
          <Command.Group heading="navigate" className="text-[10px] text-[var(--color-fg-3)] tracking-[2px] px-2 py-1">
            {[
              { label: "go pipelines", href: "/pipelines" },
              { label: "go sources", href: "/sources" },
              { label: "go stores", href: "/stores" },
              { label: "go schemas", href: "/schemas" },
              { label: "go groups", href: "/groups" },
              { label: "new pipeline", href: "/pipelines/new" },
            ].map((item) => (
              <Command.Item key={item.label} onSelect={() => { setOpen(false); router.push(item.href); }}
                className="px-2 py-2 text-[12px] font-mono cursor-pointer data-[selected]:bg-[var(--color-bg-elev)]">
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
```

- [ ] **Step 3: Footer**

Create `web/components/shell/Footer.tsx`:
```tsx
export function Footer({ apiUrl }: { apiUrl: string }) {
  return (
    <div className="bg-[#050505] border-t border-[#1a1a1a] px-4 py-1.5 flex justify-between text-[9px] tracking-[1.5px] text-[var(--color-fg-4)] font-mono">
      <span>● connected · api {apiUrl}</span>
      <span><span className="text-[var(--color-accent)]">▲</span> system: healthy</span>
    </div>
  );
}
```

- [ ] **Step 4: AppShell wrapper**

Create `web/components/shell/AppShell.tsx`:
```tsx
import { TopNav } from "./TopNav";
import { CommandBar } from "./CommandBar";
import { Footer } from "./Footer";
import { ToastProvider } from "@/components/providers/ToastProvider";

export function AppShell({ userName, children }: { userName?: string; children: React.ReactNode }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav userName={userName} />
      <CommandBar />
      <main className="flex-1 px-6 py-6 max-w-[1280px] w-full mx-auto">{children}</main>
      <Footer apiUrl={apiUrl} />
      <ToastProvider />
    </div>
  );
}
```

- [ ] **Step 5: (app) group layout**

Create `web/app/(app)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getToken } from "@/lib/auth/session";
import { apiAuthed } from "@/lib/api/server";
import type { MeResponse } from "@/lib/api/types";
import { AppShell } from "@/components/shell/AppShell";
import { QueryProvider } from "@/components/providers/QueryProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = await getToken();
  if (!token) redirect("/login");
  let me: MeResponse;
  try { me = await apiAuthed<MeResponse>("/auth/me"); }
  catch { redirect("/login"); }
  return (
    <QueryProvider>
      <AppShell userName={me.user.name}>{children}</AppShell>
    </QueryProvider>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add web/components/shell web/app/(app)/layout.tsx
git commit -m "web/shell: TopNav, CommandBar (cmdk), Footer, AppShell + (app) layout"
```

---

### Task 19: Overview page + lifecycle endpoints + status hook

**Files:**
- Create: `web/lib/api/endpoints/lifecycle.ts`, `pipelines.ts` (read-only methods only for now).
- Create: `web/lib/hooks/usePipelineStatusAll.ts`, `useStartPipeline.ts`, `useStopPipeline.ts`.
- Create: `web/app/(app)/page.tsx`.

- [ ] **Step 1: Types and endpoints**

Append to `web/lib/api/types.ts`:
```ts
export interface PipelineStatus {
  pipeline_id: number;
  pipeline_name: string;
  status: "Running" | "Stopped" | "Error";
  replicas?: number;
}
export interface Pipeline {
  id: number;
  name: string;
  replication: number;
  data_source_id: number | null;
  data_store_id: number | null;
  validation_schema_id: number | null;
  group_id: number | null;
  status?: string;
}
```

Create `web/lib/api/endpoints/lifecycle.ts`:
```ts
import { api } from "../client";
import type { PipelineStatus } from "../types";
export const lifecycleApi = {
  statusAll: (token: string) => api<PipelineStatus[]>("/pipeline-lifecycle/status", { token }),
  status: (id: number, token: string) => api<PipelineStatus>(`/pipeline-lifecycle/status/${id}`, { token }),
  start: (id: number, token: string) => api<PipelineStatus>(`/pipeline-lifecycle/start/${id}`, { method: "POST", token }),
  stop: (id: number, token: string) => api<PipelineStatus>(`/pipeline-lifecycle/stop/${id}`, { method: "POST", token }),
};
```

Create `web/lib/api/endpoints/pipelines.ts` (skeleton, expanded in Phase 7):
```ts
import { api } from "../client";
import type { Pipeline } from "../types";
export const pipelinesApi = {
  list: (token: string) => api<Pipeline[]>("/pipelines", { token }),
  get: (id: number, token: string) => api<Pipeline>(`/pipelines/${id}`, { token }),
};
```

- [ ] **Step 2: Hooks (client-side use only — read token via a tiny `/api/me` helper)**

Create `web/app/api/me/route.ts` to expose the token-resolved user to client code without exposing the token:
```ts
import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";
import { authApi } from "@/lib/api/endpoints/auth";
export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "unauth" }, { status: 401 });
  try { return NextResponse.json(await authApi.me(token)); }
  catch { return NextResponse.json({ error: "unauth" }, { status: 401 }); }
}
```

For client-side data calls we'll proxy through Next route handlers. Create a thin proxy at `web/app/api/proxy/[...path]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getToken } from "@/lib/auth/session";

const BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

async function forward(req: Request, path: string[]) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const url = `${BASE}/${path.join("/")}${new URL(req.url).search}`;
  const init: RequestInit = {
    method: req.method,
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  };
  const res = await fetch(url, init);
  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await params).path);
}
export const POST = (req: Request, ctx: { params: Promise<{ path: string[] }> }) => GET(req, ctx);
export const PUT = (req: Request, ctx: { params: Promise<{ path: string[] }> }) => GET(req, ctx);
export const DELETE = (req: Request, ctx: { params: Promise<{ path: string[] }> }) => GET(req, ctx);
```

Update `web/lib/api/client.ts` BASE to use the proxy on the client. Modify the file:
```ts
const BASE = typeof window === "undefined"
  ? (process.env.INTERNAL_API_URL ?? "http://localhost:8080")
  : "/api/proxy";
```

> **Why**: server components hit the backend directly; the browser routes through `/api/proxy/*` so the token never leaves Next.

- [ ] **Step 3: Hooks**

Create `web/lib/hooks/usePipelineStatusAll.ts`:
```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { PipelineStatus } from "@/lib/api/types";

export function usePipelineStatusAll() {
  return useQuery({
    queryKey: ["pipelines", "status", "all"],
    queryFn: () => api<PipelineStatus[]>("/pipeline-lifecycle/status"),
    refetchInterval: 5000,
  });
}
```

Create `web/lib/hooks/useStartPipeline.ts`:
```ts
"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { PipelineStatus } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function useStartPipeline() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => api<PipelineStatus>(`/pipeline-lifecycle/start/${id}`, { method: "POST" }),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["pipelines"] }); push({ kind: "success", message: `started ${d.pipeline_name}` }); },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
```

Create `web/lib/hooks/useStopPipeline.ts` (mirrors `useStartPipeline`, hitting `/stop`).

- [ ] **Step 4: Overview page**

Create `web/app/(app)/page.tsx`:
```tsx
"use client";
import { Panel } from "@/components/ui/Panel";
import { Pill, type PillState } from "@/components/ui/Pill";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useStartPipeline } from "@/lib/hooks/useStartPipeline";
import { useStopPipeline } from "@/lib/hooks/useStopPipeline";

function toPill(s: string): PillState {
  if (s === "Running") return "running";
  if (s === "Error") return "error";
  return "idle";
}

export default function Overview() {
  const { data, isLoading } = usePipelineStatusAll();
  const start = useStartPipeline();
  const stop = useStopPipeline();

  const list = data ?? [];
  const running = list.filter((p) => p.status === "Running").length;
  const errored = list.filter((p) => p.status === "Error").length;
  const total = list.length;

  return (
    <div>
      <h1 className="t-title mb-4">overview</h1>
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Panel tone="accent"><div className="t-label">// ACTIVE</div><div className="t-title mt-1">{running} / {total}</div></Panel>
        <Panel tone={errored ? "danger" : "default"}><div className="t-label">// ERRORS</div><div className="t-title mt-1">{errored}</div></Panel>
        <Panel><div className="t-label">// TOTAL PIPELINES</div><div className="t-title mt-1">{total}</div></Panel>
      </div>
      <h2 className="t-section mb-3">// pipelines</h2>
      {isLoading ? <div className="t-mono">// loading…</div> : list.length === 0 ? (
        <div className="t-mono">// no pipelines yet — start by creating a data source</div>
      ) : (
        <Table>
          <THead><TH>#</TH><TH>NAME</TH><TH>STATE</TH><TH className="text-right">ACTIONS</TH></THead>
          <tbody>
            {list.map((p) => (
              <TR key={p.pipeline_id}>
                <TD>{String(p.pipeline_id).padStart(2, "0")}</TD>
                <TD>{p.pipeline_name}</TD>
                <TD><Pill state={toPill(p.status)}>{p.status.toUpperCase()}</Pill></TD>
                <TD className="text-right">
                  <div className="flex gap-1.5 justify-end">
                    {p.status === "Running"
                      ? <button onClick={() => stop.mutate(p.pipeline_id)} className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]">■ stop</button>
                      : <button onClick={() => start.mutate(p.pipeline_id)} className="text-[10px] border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-1 rounded-[2px]">▸ start</button>}
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Smoke**

Run both servers. Visit `/login` → create admin → land on `/app` overview. Initially empty pipelines list; shell + nav + command bar visible.

- [ ] **Step 6: Commit and tag**

```bash
git add web/app web/lib/api web/lib/hooks
git commit -m "web/app: overview page, lifecycle hooks, proxy route"
git tag phase-4-shell-overview
```

---

## Phase 5 — Simple CRUD modules: Sources, Stores, Groups, Connection Types

> All three modules share the same pattern: list page (Table) + create/edit form (modal or page). One module is detailed below; the other two follow the identical pattern with only field shapes changing.

### Task 20: Connection Types endpoint + types

**Files:**
- Modify: `web/lib/api/types.ts`.
- Create: `web/lib/api/endpoints/connectionTypes.ts`.

- [ ] **Step 1: Types**

Append to `web/lib/api/types.ts`:
```ts
export interface ConnectionType { id: number; name: string; }

export type SourceType = "RABBIT_MQ" | "MQTT" | "KAFKA";
export interface RabbitMqConfig { host: string; queue: string; }
export interface MqttConfig { host: string; topic: string; }
export interface KafkaConfig { brokers: string; topic: string; group_id: string; }

export interface DataSource {
  id: number; name: string; sourceType: SourceType;
  config: RabbitMqConfig | MqttConfig | KafkaConfig;
}
export interface CreateDataSourceRequest {
  name: string; sourceType: SourceType;
  config: RabbitMqConfig | MqttConfig | KafkaConfig;
}

export type StoreType = "INFLUX_DB" | "LOCAL_LOG";
export interface DataStore {
  id: number; name: string; persistenceType: StoreType;
  host?: string; database?: string; measurement?: string;
  tag_fields?: string[]; log_name?: string;
}
export interface CreateDataStoreRequest extends Omit<DataStore, "id"> {}

export interface PipelineGroup { id: number; name: string; }
export interface CreatePipelineGroupRequest { name: string; }
```

- [ ] **Step 2: Endpoint module**

Create `web/lib/api/endpoints/connectionTypes.ts`:
```ts
import { api } from "../client";
import type { ConnectionType } from "../types";
export const connectionTypesApi = {
  list: () => api<ConnectionType[]>("/connection-types"),
};
```

- [ ] **Step 3: Commit**

```bash
git add web/lib/api
git commit -m "web/api: types + connection-types endpoint"
```

---

### Task 21: Data Sources CRUD (list + form)

**Files:**
- Create: `web/lib/api/endpoints/sources.ts`, `web/lib/hooks/useSources.ts`, `web/lib/schemas/source.ts`.
- Create: `web/app/(app)/sources/page.tsx`, `web/app/(app)/sources/new/page.tsx`, `web/app/(app)/sources/[id]/edit/page.tsx`.
- Create: `web/components/forms/DataSourceForm.tsx`.

- [ ] **Step 1: Endpoints**

Create `web/lib/api/endpoints/sources.ts`:
```ts
import { api } from "../client";
import type { CreateDataSourceRequest, DataSource } from "../types";
export const sourcesApi = {
  list: () => api<DataSource[]>("/data-sources"),
  get: (id: number) => api<DataSource>(`/data-sources/${id}`),
  create: (body: CreateDataSourceRequest) => api<DataSource>("/data-sources", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: CreateDataSourceRequest) => api<DataSource>(`/data-sources/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id: number) => api<{ message: string }>(`/data-sources/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 2: Hooks**

Create `web/lib/hooks/useSources.ts`:
```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sourcesApi } from "@/lib/api/endpoints/sources";
import type { CreateDataSourceRequest } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function useSources() {
  return useQuery({ queryKey: ["sources"], queryFn: sourcesApi.list });
}
export function useSource(id: number) {
  return useQuery({ queryKey: ["sources", id], queryFn: () => sourcesApi.get(id), enabled: id > 0 });
}
export function useCreateSource() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (body: CreateDataSourceRequest) => sourcesApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sources"] }); push({ kind: "success", message: "source created" }); },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
export function useUpdateSource(id: number) {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (body: CreateDataSourceRequest) => sourcesApi.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sources"] }); push({ kind: "success", message: "source updated" }); },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
export function useDeleteSource() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => sourcesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sources"] }); push({ kind: "success", message: "source deleted" }); },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
```

- [ ] **Step 3: Zod schemas**

Create `web/lib/schemas/source.ts`:
```ts
import { z } from "zod";

const rabbitConfig = z.object({ host: z.string().min(1), queue: z.string().min(1) });
const mqttConfig   = z.object({ host: z.string().min(1), topic: z.string().min(1) });
const kafkaConfig  = z.object({ brokers: z.string().min(1), topic: z.string().min(1), group_id: z.string().min(1) });

export const sourceSchema = z.discriminatedUnion("sourceType", [
  z.object({ name: z.string().min(1), sourceType: z.literal("RABBIT_MQ"), config: rabbitConfig }),
  z.object({ name: z.string().min(1), sourceType: z.literal("MQTT"),       config: mqttConfig }),
  z.object({ name: z.string().min(1), sourceType: z.literal("KAFKA"),      config: kafkaConfig }),
]);
export type SourceInput = z.infer<typeof sourceSchema>;
```

- [ ] **Step 4: Form component**

Create `web/components/forms/DataSourceForm.tsx`:
```tsx
"use client";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sourceSchema, type SourceInput } from "@/lib/schemas/source";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

interface Props { defaultValues?: Partial<SourceInput>; onSubmit: SubmitHandler<SourceInput>; submitting?: boolean; submitLabel: string; }

export function DataSourceForm({ defaultValues, onSubmit, submitting, submitLabel }: Props) {
  const form = useForm<SourceInput>({ resolver: zodResolver(sourceSchema), defaultValues: defaultValues as SourceInput });
  const type = form.watch("sourceType") ?? "RABBIT_MQ";
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-[640px]">
      <FormField label="NAME" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </FormField>
      <FormField label="SOURCE TYPE">
        <select className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full"
          {...form.register("sourceType")}>
          <option value="RABBIT_MQ">RABBIT_MQ</option>
          <option value="MQTT">MQTT</option>
          <option value="KAFKA">KAFKA</option>
        </select>
      </FormField>
      {type === "RABBIT_MQ" && (<>
        <FormField label="HOST"><Input {...form.register("config.host" as const)} placeholder="amqp://localhost:5672" /></FormField>
        <FormField label="QUEUE"><Input {...form.register("config.queue" as const)} /></FormField>
      </>)}
      {type === "MQTT" && (<>
        <FormField label="HOST"><Input {...form.register("config.host" as const)} placeholder="mqtt://localhost:1883" /></FormField>
        <FormField label="TOPIC"><Input {...form.register("config.topic" as const)} /></FormField>
      </>)}
      {type === "KAFKA" && (<>
        <FormField label="BROKERS"><Input {...form.register("config.brokers" as const)} placeholder="localhost:9092" /></FormField>
        <FormField label="TOPIC"><Input {...form.register("config.topic" as const)} /></FormField>
        <FormField label="GROUP ID"><Input {...form.register("config.group_id" as const)} /></FormField>
      </>)}
      <div className="flex gap-3 items-center mt-4">
        <Button type="submit" variant="primary" disabled={submitting}>{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={() => history.back()}>cancel</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: List page**

Create `web/app/(app)/sources/page.tsx`:
```tsx
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useDeleteSource, useSources } from "@/lib/hooks/useSources";

export default function SourcesPage() {
  const { data, isLoading } = useSources();
  const del = useDeleteSource();
  return (
    <div>
      <h1 className="t-title mb-1">data sources</h1>
      <p className="t-mono mb-4">// message-broker connections that feed pipelines.</p>
      <div className="flex gap-3 items-center mb-4">
        <Link href="/sources/new"><Button variant="primary">+ NEW SOURCE</Button></Link>
      </div>
      {isLoading ? <div className="t-mono">// loading…</div> :
        (data ?? []).length === 0 ? <div className="t-mono">// no data sources yet</div> : (
        <Table>
          <THead><TH>#</TH><TH>NAME</TH><TH>TYPE</TH><TH className="text-right">ACTIONS</TH></THead>
          <tbody>
            {(data ?? []).map((s) => (
              <TR key={s.id}>
                <TD>{String(s.id).padStart(2, "0")}</TD>
                <TD>{s.name}</TD>
                <TD>{s.sourceType}</TD>
                <TD className="text-right">
                  <div className="flex gap-1.5 justify-end">
                    <Link href={`/sources/${s.id}/edit`}><span className="text-[10px] border border-[#333] text-[var(--color-fg-1)] px-2 py-1 rounded-[2px]">edit</span></Link>
                    <button onClick={() => confirm(`delete ${s.name}?`) && del.mutate(s.id)} className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]">delete</button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create page**

Create `web/app/(app)/sources/new/page.tsx`:
```tsx
"use client";
import { useRouter } from "next/navigation";
import { DataSourceForm } from "@/components/forms/DataSourceForm";
import { useCreateSource } from "@/lib/hooks/useSources";

export default function NewSourcePage() {
  const router = useRouter();
  const create = useCreateSource();
  return (
    <div>
      <h1 className="t-title mb-1">new data source</h1>
      <p className="t-mono mb-6">// step 1 of any pipeline.</p>
      <DataSourceForm
        defaultValues={{ sourceType: "RABBIT_MQ", config: { host: "", queue: "" } } as any}
        submitLabel="+ CREATE SOURCE"
        submitting={create.isPending}
        onSubmit={async (values) => { await create.mutateAsync(values); router.push("/sources"); }}
      />
    </div>
  );
}
```

- [ ] **Step 7: Edit page**

Create `web/app/(app)/sources/[id]/edit/page.tsx`:
```tsx
"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DataSourceForm } from "@/components/forms/DataSourceForm";
import { useSource, useUpdateSource } from "@/lib/hooks/useSources";

export default function EditSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const numericId = Number(id);
  const router = useRouter();
  const { data, isLoading } = useSource(numericId);
  const update = useUpdateSource(numericId);
  if (isLoading || !data) return <div className="t-mono">// loading…</div>;
  return (
    <div>
      <h1 className="t-title mb-1">edit · {data.name}</h1>
      <DataSourceForm
        defaultValues={data}
        submitLabel="✓ SAVE"
        submitting={update.isPending}
        onSubmit={async (values) => { await update.mutateAsync(values); router.push("/sources"); }}
      />
    </div>
  );
}
```

- [ ] **Step 8: Smoke**

Visit `/sources`, create a RABBIT_MQ source, list shows it, edit, delete.

- [ ] **Step 9: Commit**

```bash
git add web/lib web/components/forms web/app/(app)/sources
git commit -m "web/sources: full CRUD with discriminated-union form"
```

---

### Task 22: Data Stores CRUD

Mirrors Task 21 with these specifics:

**Files:**
- Create: `web/lib/api/endpoints/stores.ts`, `web/lib/hooks/useStores.ts`, `web/lib/schemas/store.ts`.
- Create: `web/components/forms/DataStoreForm.tsx`.
- Create: `web/app/(app)/stores/{page.tsx, new/page.tsx, [id]/edit/page.tsx}`.

- [ ] **Step 1: Endpoints**

```ts
// web/lib/api/endpoints/stores.ts
import { api } from "../client";
import type { CreateDataStoreRequest, DataStore } from "../types";
export const storesApi = {
  list: () => api<DataStore[]>("/data-stores"),
  get: (id: number) => api<DataStore>(`/data-stores/${id}`),
  create: (b: CreateDataStoreRequest) => api<DataStore>("/data-stores", { method: "POST", body: JSON.stringify(b) }),
  update: (id: number, b: CreateDataStoreRequest) => api<DataStore>(`/data-stores/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove: (id: number) => api<{message:string}>(`/data-stores/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 2: Hooks** (same shape as `useSources.ts` — copy-replace `sources` → `stores`, `Source` → `Store`).

- [ ] **Step 3: Schema**

```ts
// web/lib/schemas/store.ts
import { z } from "zod";
export const storeSchema = z.discriminatedUnion("persistenceType", [
  z.object({ name: z.string().min(1), persistenceType: z.literal("INFLUX_DB"),
    host: z.string().min(1), database: z.string().min(1), measurement: z.string().min(1),
    tag_fields: z.array(z.string()).optional() }),
  z.object({ name: z.string().min(1), persistenceType: z.literal("LOCAL_LOG"),
    log_name: z.string().min(1) }),
]);
export type StoreInput = z.infer<typeof storeSchema>;
```

- [ ] **Step 4: Form component**

```tsx
// web/components/forms/DataStoreForm.tsx
"use client";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { storeSchema, type StoreInput } from "@/lib/schemas/store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

export function DataStoreForm({ defaultValues, onSubmit, submitting, submitLabel }: {
  defaultValues?: Partial<StoreInput>; onSubmit: SubmitHandler<StoreInput>; submitting?: boolean; submitLabel: string;
}) {
  const form = useForm<StoreInput>({ resolver: zodResolver(storeSchema), defaultValues: defaultValues as StoreInput });
  const t = form.watch("persistenceType") ?? "INFLUX_DB";
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-[640px]">
      <FormField label="NAME" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></FormField>
      <FormField label="STORE TYPE">
        <select className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full" {...form.register("persistenceType")}>
          <option value="INFLUX_DB">INFLUX_DB</option>
          <option value="LOCAL_LOG">LOCAL_LOG</option>
        </select>
      </FormField>
      {t === "INFLUX_DB" && (<>
        <FormField label="HOST"><Input {...form.register("host" as const)} placeholder="http://localhost:8086" /></FormField>
        <FormField label="DATABASE"><Input {...form.register("database" as const)} /></FormField>
        <FormField label="MEASUREMENT"><Input {...form.register("measurement" as const)} /></FormField>
        <FormField label="TAG FIELDS (comma-separated)">
          <Input placeholder="location,device_id"
            {...form.register("tag_fields" as const, { setValueAs: (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v) })} />
        </FormField>
      </>)}
      {t === "LOCAL_LOG" && (
        <FormField label="LOG NAME"><Input {...form.register("log_name" as const)} /></FormField>
      )}
      <div className="flex gap-3 items-center mt-4">
        <Button type="submit" variant="primary" disabled={submitting}>{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={() => history.back()}>cancel</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Pages** (list, new, edit) — exact same structure as `sources` pages, substituting types and the form component. Implement them now.

- [ ] **Step 6: Commit**

```bash
git add web/lib/api/endpoints/stores.ts web/lib/hooks/useStores.ts web/lib/schemas/store.ts web/components/forms/DataStoreForm.tsx web/app/(app)/stores
git commit -m "web/stores: full CRUD"
```

---

### Task 23: Pipeline Groups CRUD

**Files:** `web/lib/api/endpoints/groups.ts`, `web/lib/hooks/useGroups.ts`, `web/lib/schemas/group.ts`, `web/app/(app)/groups/{page.tsx,new/page.tsx}`.

- [ ] **Step 1: Endpoints**

```ts
// web/lib/api/endpoints/groups.ts
import { api } from "../client";
import type { CreatePipelineGroupRequest, PipelineGroup } from "../types";
export const groupsApi = {
  list: () => api<PipelineGroup[]>("/pipeline-groups"),
  get: (id: number) => api<PipelineGroup>(`/pipeline-groups/${id}`),
  create: (b: CreatePipelineGroupRequest) => api<PipelineGroup>("/pipeline-groups", { method: "POST", body: JSON.stringify(b) }),
  remove: (id: number) => api<{message:string}>(`/pipeline-groups/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 2: Hooks** following the same pattern (`useGroups`, `useCreateGroup`, `useDeleteGroup` — no edit; groups don't expose update in the backend API).

- [ ] **Step 3: Schema**

```ts
// web/lib/schemas/group.ts
import { z } from "zod";
export const groupSchema = z.object({ name: z.string().min(1, "name is required") });
export type GroupInput = z.infer<typeof groupSchema>;
```

- [ ] **Step 4: List page** with an inline create form (single field, no separate `/new` route needed).

```tsx
// web/app/(app)/groups/page.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useCreateGroup, useDeleteGroup, useGroups } from "@/lib/hooks/useGroups";
import { groupSchema, type GroupInput } from "@/lib/schemas/group";

export default function GroupsPage() {
  const { data } = useGroups();
  const create = useCreateGroup();
  const del = useDeleteGroup();
  const form = useForm<GroupInput>({ resolver: zodResolver(groupSchema) });
  return (
    <div>
      <h1 className="t-title mb-1">pipeline groups</h1>
      <p className="t-mono mb-6">// optional logical containers for pipelines.</p>

      <form onSubmit={form.handleSubmit(async (v) => { await create.mutateAsync(v); form.reset(); })} className="flex gap-3 items-end mb-6 max-w-[420px]">
        <FormField label="NEW GROUP NAME" className="flex-1 mb-0" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </FormField>
        <Button type="submit" variant="primary">+ CREATE</Button>
      </form>

      {(data ?? []).length === 0 ? <div className="t-mono">// no groups yet</div> : (
        <Table>
          <THead><TH>#</TH><TH>NAME</TH><TH className="text-right">ACTIONS</TH></THead>
          <tbody>
            {(data ?? []).map((g) => (
              <TR key={g.id}>
                <TD>{String(g.id).padStart(2, "0")}</TD>
                <TD>{g.name}</TD>
                <TD className="text-right">
                  <button onClick={() => confirm(`delete ${g.name}?`) && del.mutate(g.id)} className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]">delete</button>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit and tag end of Phase 5**

```bash
git add web/lib web/app/(app)/groups
git commit -m "web/groups: inline-create CRUD"
git tag phase-5-simple-modules
```

---

## Phase 6 — Validation Schemas builder

### Task 24: Schemas types, endpoint, hooks, list page

**Files:**
- Modify: `web/lib/api/types.ts`.
- Create: `web/lib/api/endpoints/schemas.ts`, `web/lib/hooks/useSchemas.ts`, `web/lib/schemas/validationSchema.ts`.
- Create: `web/app/(app)/schemas/page.tsx`.

- [ ] **Step 1: Types**

Append to `web/lib/api/types.ts`:
```ts
export type FieldType = "float" | "int" | "bool" | "string";
export type Operator = "Add" | "Subtract" | "Multiply" | "Divide";
export interface SchemaOperation { operator: Operator; operand: number; }
export interface SchemaField {
  name: string; field_type: FieldType; required: boolean;
  default?: number | boolean | string; min?: number; max?: number;
  operations?: SchemaOperation[];
}
export interface ValidationSchema { id: number; name: string; schema: { fields: SchemaField[] }; }
export interface CreateValidationSchemaRequest { name: string; schema: { fields: SchemaField[] }; }
```

- [ ] **Step 2: Endpoints**

```ts
// web/lib/api/endpoints/schemas.ts
import { api } from "../client";
import type { CreateValidationSchemaRequest, ValidationSchema } from "../types";
export const schemasApi = {
  list: () => api<ValidationSchema[]>("/validation-schemas"),
  get: (id: number) => api<ValidationSchema>(`/validation-schemas/${id}`),
  create: (b: CreateValidationSchemaRequest) => api<ValidationSchema>("/validation-schemas", { method: "POST", body: JSON.stringify(b) }),
  update: (id: number, b: CreateValidationSchemaRequest) => api<ValidationSchema>(`/validation-schemas/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  rename: (id: number, name: string) => api<ValidationSchema>(`/validation-schemas/${id}/name`, { method: "PUT", body: JSON.stringify({ name }) }),
  remove: (id: number) => api<{message:string}>(`/validation-schemas/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 3: Hooks** mirror `useSources.ts` (list, get, create, update, remove).

- [ ] **Step 4: Zod schema for the builder**

```ts
// web/lib/schemas/validationSchema.ts
import { z } from "zod";

const operatorEnum = z.enum(["Add", "Subtract", "Multiply", "Divide"]);
const fieldTypeEnum = z.enum(["float", "int", "bool", "string"]);
const operationSchema = z.object({ operator: operatorEnum, operand: z.number() });

export const fieldSchema = z.object({
  name: z.string().min(1, "name is required"),
  field_type: fieldTypeEnum,
  required: z.boolean(),
  default: z.union([z.number(), z.boolean(), z.string()]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  operations: z.array(operationSchema).default([]),
});

export const builderSchema = z.object({
  name: z.string().min(1, "name is required"),
  schema: z.object({ fields: z.array(fieldSchema).min(1, "at least one field") }),
});
export type BuilderInput = z.infer<typeof builderSchema>;
```

- [ ] **Step 5: List page**

```tsx
// web/app/(app)/schemas/page.tsx
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { useDeleteSchema, useSchemas } from "@/lib/hooks/useSchemas";

export default function SchemasPage() {
  const { data } = useSchemas();
  const del = useDeleteSchema();
  return (
    <div>
      <h1 className="t-title mb-1">validation schemas</h1>
      <p className="t-mono mb-4">// field-level validation and arithmetic transforms.</p>
      <div className="flex gap-3 items-center mb-4">
        <Link href="/schemas/new"><Button variant="primary">+ NEW SCHEMA</Button></Link>
      </div>
      {(data ?? []).length === 0 ? <div className="t-mono">// no schemas yet</div> : (
        <Table>
          <THead><TH>#</TH><TH>NAME</TH><TH>FIELDS</TH><TH className="text-right">ACTIONS</TH></THead>
          <tbody>
            {(data ?? []).map((s) => (
              <TR key={s.id}>
                <TD>{String(s.id).padStart(2, "0")}</TD>
                <TD>{s.name}</TD>
                <TD>{s.schema.fields.length}</TD>
                <TD className="text-right">
                  <div className="flex gap-1.5 justify-end">
                    <Link href={`/schemas/${s.id}`}><span className="text-[10px] border border-[#333] text-[var(--color-fg-1)] px-2 py-1 rounded-[2px]">edit</span></Link>
                    <button onClick={() => confirm(`delete ${s.name}?`) && del.mutate(s.id)} className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]">delete</button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add web/lib web/app/(app)/schemas/page.tsx
git commit -m "web/schemas: list page + endpoints/hooks/types"
```

---

### Task 25: Schemas builder (`/schemas/new` and `/schemas/[id]`)

**Files:**
- Create: `web/components/forms/SchemaBuilder.tsx`.
- Create: `web/app/(app)/schemas/new/page.tsx`, `web/app/(app)/schemas/[id]/page.tsx`.

- [ ] **Step 1: SchemaBuilder component**

Create `web/components/forms/SchemaBuilder.tsx`:
```tsx
"use client";
import { Controller, useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { builderSchema, type BuilderInput } from "@/lib/schemas/validationSchema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";

interface Props { defaultValues?: BuilderInput; submitLabel: string; submitting?: boolean; onSubmit: SubmitHandler<BuilderInput>; }

export function SchemaBuilder({ defaultValues, submitLabel, submitting, onSubmit }: Props) {
  const form = useForm<BuilderInput>({
    resolver: zodResolver(builderSchema),
    defaultValues: defaultValues ?? { name: "", schema: { fields: [{ name: "", field_type: "float", required: true, operations: [] }] } },
  });
  const fields = useFieldArray({ control: form.control, name: "schema.fields" });
  const values = form.watch();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div>
        <FormField label="SCHEMA NAME" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} />
        </FormField>

        <h2 className="t-section mt-6 mb-3">// fields</h2>
        <div className="flex flex-col gap-3">
          {fields.fields.map((f, idx) => (
            <Panel key={f.id} tone="default">
              <div className="flex justify-between items-center mb-3">
                <div className="t-label">// field {String(idx + 1).padStart(2, "0")}</div>
                <button type="button" onClick={() => fields.remove(idx)} className="text-[10px] text-[var(--color-danger)]">remove</button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <FormField label="NAME"><Input {...form.register(`schema.fields.${idx}.name` as const)} /></FormField>
                <FormField label="TYPE">
                  <select className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full" {...form.register(`schema.fields.${idx}.field_type` as const)}>
                    <option value="float">float</option><option value="int">int</option><option value="bool">bool</option><option value="string">string</option>
                  </select>
                </FormField>
              </div>
              <div className="grid md:grid-cols-3 gap-3 mt-3">
                <label className="flex items-center gap-2 text-[11px] mt-5">
                  <input type="checkbox" {...form.register(`schema.fields.${idx}.required` as const)} /> required
                </label>
                <FormField label="MIN"><Input type="number" step="any" {...form.register(`schema.fields.${idx}.min` as const, { valueAsNumber: true })} /></FormField>
                <FormField label="MAX"><Input type="number" step="any" {...form.register(`schema.fields.${idx}.max` as const, { valueAsNumber: true })} /></FormField>
              </div>

              {/* Operations sub-list */}
              <Controller
                control={form.control}
                name={`schema.fields.${idx}.operations` as const}
                render={({ field }) => {
                  const ops = field.value ?? [];
                  return (
                    <div className="mt-3">
                      <div className="t-label mb-2">// operations</div>
                      <div className="flex flex-col gap-2">
                        {ops.map((op, oi) => (
                          <div key={oi} className="flex gap-2 items-center">
                            <select value={op.operator} className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-2 py-1 text-[11px] font-mono"
                              onChange={(e) => { const v = [...ops]; v[oi] = { ...op, operator: e.target.value as any }; field.onChange(v); }}>
                              <option>Add</option><option>Subtract</option><option>Multiply</option><option>Divide</option>
                            </select>
                            <Input value={op.operand} type="number" step="any"
                              onChange={(e) => { const v = [...ops]; v[oi] = { ...op, operand: Number(e.target.value) }; field.onChange(v); }} />
                            <button type="button" onClick={() => field.onChange(ops.filter((_, i) => i !== oi))} className="text-[10px] text-[var(--color-danger)] px-2">×</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => field.onChange([...ops, { operator: "Add", operand: 0 }])} className="text-[10px] text-[var(--color-accent)] self-start">+ add operation</button>
                      </div>
                    </div>
                  );
                }}
              />
            </Panel>
          ))}
        </div>

        <div className="flex gap-3 items-center mt-4">
          <Button type="button" variant="ghost" onClick={() => fields.append({ name: "", field_type: "float", required: true, operations: [] })}>+ ADD FIELD</Button>
          <Button type="submit" variant="primary" disabled={submitting}>{submitLabel}</Button>
        </div>
      </div>

      <aside>
        <h2 className="t-section mb-3">// preview</h2>
        <Panel>
          <pre className="text-[10px] font-mono leading-snug overflow-x-auto">{JSON.stringify({ name: values.name, schema: values.schema }, null, 2)}</pre>
        </Panel>
      </aside>
    </form>
  );
}
```

- [ ] **Step 2: New page**

```tsx
// web/app/(app)/schemas/new/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { useCreateSchema } from "@/lib/hooks/useSchemas";

export default function NewSchemaPage() {
  const router = useRouter();
  const create = useCreateSchema();
  return (
    <div>
      <h1 className="t-title mb-1">new validation schema</h1>
      <p className="t-mono mb-6">// define fields and transforms.</p>
      <SchemaBuilder
        submitLabel="+ CREATE SCHEMA"
        submitting={create.isPending}
        onSubmit={async (values) => { await create.mutateAsync(values); router.push("/schemas"); }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Edit page**

```tsx
// web/app/(app)/schemas/[id]/page.tsx
"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { SchemaBuilder } from "@/components/forms/SchemaBuilder";
import { useSchema, useUpdateSchema } from "@/lib/hooks/useSchemas";

export default function EditSchemaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const numericId = Number(id);
  const router = useRouter();
  const { data, isLoading } = useSchema(numericId);
  const update = useUpdateSchema(numericId);
  if (isLoading || !data) return <div className="t-mono">// loading…</div>;
  return (
    <div>
      <h1 className="t-title mb-1">edit · {data.name}</h1>
      <SchemaBuilder
        defaultValues={data as any}
        submitLabel="✓ SAVE"
        submitting={update.isPending}
        onSubmit={async (v) => { await update.mutateAsync(v); router.push("/schemas"); }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Smoke + commit + tag end of Phase 6**

```bash
cd web && pnpm typecheck && pnpm lint
git add web/components/forms/SchemaBuilder.tsx web/app/(app)/schemas
git commit -m "web/schemas: builder with field cards and ops"
git tag phase-6-schemas-builder
```

---

## Phase 7 — Pipelines wizard, detail and lifecycle

### Task 26: Pipelines endpoints (full) and hooks

**Files:**
- Modify: `web/lib/api/endpoints/pipelines.ts`.
- Create: `web/lib/hooks/usePipelines.ts`.
- Modify: `web/lib/api/types.ts`.

- [ ] **Step 1: Types**

Append to `web/lib/api/types.ts`:
```ts
export interface CreatePipelineRequest {
  name: string; replication: number;
  data_source_id?: number; data_store_id?: number;
  validation_schema_id?: number; group_id?: number;
}
export interface AssignRelationRequest { pipeline_id: number; [k: string]: number; }
```

- [ ] **Step 2: Endpoints**

Replace the contents of `web/lib/api/endpoints/pipelines.ts` with:
```ts
import { api } from "../client";
import type { CreatePipelineRequest, Pipeline } from "../types";
export const pipelinesApi = {
  list: () => api<Pipeline[]>("/pipelines"),
  get: (id: number) => api<Pipeline>(`/pipelines/${id}`),
  byGroup: (gid: number) => api<Pipeline[]>(`/pipelines/group/${gid}`),
  create: (b: CreatePipelineRequest) => api<Pipeline>("/pipelines", { method: "POST", body: JSON.stringify(b) }),
  remove: (id: number) => api<{message:string}>(`/pipelines/${id}`, { method: "DELETE" }),
  assignSource: (pipeline_id: number, data_source_id: number) =>
    api<Pipeline>("/pipelines/data_source", { method: "PUT", body: JSON.stringify({ pipeline_id, data_source_id }) }),
  assignStore: (pipeline_id: number, data_store_id: number) =>
    api<Pipeline>("/pipelines/data_store", { method: "PUT", body: JSON.stringify({ pipeline_id, data_store_id }) }),
  assignSchema: (pipeline_id: number, validation_schema_id: number) =>
    api<Pipeline>("/pipelines/validation_schema", { method: "PUT", body: JSON.stringify({ pipeline_id, validation_schema_id }) }),
  assignGroup: (pipeline_id: number, group_id: number) =>
    api<Pipeline>("/pipelines/group", { method: "PUT", body: JSON.stringify({ pipeline_id, group_id }) }),
};
```

- [ ] **Step 3: Hooks**

```ts
// web/lib/hooks/usePipelines.ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pipelinesApi } from "@/lib/api/endpoints/pipelines";
import type { CreatePipelineRequest } from "@/lib/api/types";
import { useToasts } from "@/lib/store/useToasts";

export function usePipelines() { return useQuery({ queryKey: ["pipelines", "list"], queryFn: pipelinesApi.list }); }
export function usePipeline(id: number) { return useQuery({ queryKey: ["pipelines", id], queryFn: () => pipelinesApi.get(id), enabled: id > 0 }); }
export function useCreatePipeline() {
  const qc = useQueryClient(); const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (b: CreatePipelineRequest) => pipelinesApi.create(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipelines"] }); push({ kind: "success", message: "pipeline created" }); },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
export function useDeletePipeline() {
  const qc = useQueryClient(); const push = useToasts((s) => s.push);
  return useMutation({
    mutationFn: (id: number) => pipelinesApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pipelines"] }); push({ kind: "success", message: "pipeline deleted" }); },
    onError: (e: Error) => push({ kind: "error", message: e.message }),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add web/lib
git commit -m "web/pipelines: full endpoints and hooks"
```

---

### Task 27: Pipelines list page

**Files:**
- Create: `web/app/(app)/pipelines/page.tsx`.

- [ ] **Step 1: Implement**

```tsx
// web/app/(app)/pipelines/page.tsx
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Pill, type PillState } from "@/components/ui/Pill";
import { Table, THead, TH, TR, TD } from "@/components/ui/Table";
import { usePipelines, useDeletePipeline } from "@/lib/hooks/usePipelines";
import { usePipelineStatusAll } from "@/lib/hooks/usePipelineStatusAll";
import { useStartPipeline } from "@/lib/hooks/useStartPipeline";
import { useStopPipeline } from "@/lib/hooks/useStopPipeline";

function toPill(s?: string): PillState {
  if (s === "Running") return "running"; if (s === "Error") return "error"; return "idle";
}

export default function PipelinesPage() {
  const { data: pipes } = usePipelines();
  const { data: status } = usePipelineStatusAll();
  const start = useStartPipeline(); const stop = useStopPipeline(); const del = useDeletePipeline();
  const stMap = new Map((status ?? []).map((s) => [s.pipeline_id, s.status]));
  const list = pipes ?? [];

  return (
    <div>
      <h1 className="t-title mb-1">pipelines</h1>
      <p className="t-mono mb-4">// connect a source, a schema, a store. then start.</p>
      <div className="flex gap-3 items-center mb-4">
        <Link href="/pipelines/new"><Button variant="primary">+ NEW PIPELINE</Button></Link>
      </div>
      {list.length === 0 ? <div className="t-mono">// no pipelines yet</div> : (
        <Table>
          <THead><TH>#</TH><TH>NAME</TH><TH>REPL.</TH><TH>STATE</TH><TH className="text-right">ACTIONS</TH></THead>
          <tbody>
            {list.map((p) => {
              const st = stMap.get(p.id);
              const running = st === "Running";
              return (
                <TR key={p.id}>
                  <TD>{String(p.id).padStart(2, "0")}</TD>
                  <TD><Link href={`/pipelines/${p.id}`} className="hover:text-[var(--color-accent)]">{p.name}</Link></TD>
                  <TD>{p.replication}</TD>
                  <TD><Pill state={toPill(st)}>{(st ?? "STOPPED").toUpperCase()}</Pill></TD>
                  <TD className="text-right">
                    <div className="flex gap-1.5 justify-end">
                      {running
                        ? <button onClick={() => stop.mutate(p.id)} className="text-[10px] border border-[var(--color-danger)] text-[var(--color-danger)] px-2 py-1 rounded-[2px]">■ stop</button>
                        : <button onClick={() => start.mutate(p.id)} className="text-[10px] border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-1 rounded-[2px]">▸ start</button>}
                      <button onClick={() => confirm(`delete ${p.name}?`) && del.mutate(p.id)} className="text-[10px] border border-[#333] text-[var(--color-fg-3)] px-2 py-1 rounded-[2px]">delete</button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/app/(app)/pipelines/page.tsx
git commit -m "web/pipelines: list with live status and start/stop"
```

---

### Task 28: Pipelines wizard (`/pipelines/new`) — 5 steps

**Files:**
- Create: `web/components/forms/PipelineWizard.tsx`.
- Create: `web/app/(app)/pipelines/new/page.tsx`.
- Create: `web/lib/schemas/pipeline.ts`.

- [ ] **Step 1: Zod schema**

```ts
// web/lib/schemas/pipeline.ts
import { z } from "zod";
export const pipelineSchema = z.object({
  name: z.string().min(1, "name required"),
  data_source_id: z.number().int().positive("pick a source"),
  validation_schema_id: z.number().int().positive("pick a schema"),
  data_store_id: z.number().int().positive("pick a store"),
  replication: z.number().int().min(1).max(64),
  group_id: z.number().int().positive().optional(),
});
export type PipelineInput = z.infer<typeof pipelineSchema>;
```

- [ ] **Step 2: Wizard component**

```tsx
// web/components/forms/PipelineWizard.tsx
"use client";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pipelineSchema, type PipelineInput } from "@/lib/schemas/pipeline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";

const STEPS = ["NAME", "SOURCE", "SCHEMA", "STORE", "REPLICATION"] as const;

export function PipelineWizard({ sources, schemas, stores, onSubmit, submitting }: {
  sources: { id: number; name: string; sourceType: string }[];
  schemas: { id: number; name: string }[];
  stores: { id: number; name: string; persistenceType: string }[];
  onSubmit: SubmitHandler<PipelineInput>;
  submitting?: boolean;
}) {
  const [step, setStep] = useState(0);
  const form = useForm<PipelineInput>({ resolver: zodResolver(pipelineSchema), defaultValues: { replication: 1 } });

  async function next() {
    const fields: (keyof PipelineInput)[][] = [["name"], ["data_source_id"], ["validation_schema_id"], ["data_store_id"], ["replication"]];
    const ok = await form.trigger(fields[step]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid lg:grid-cols-[200px_1fr] gap-6">
      <aside>
        <div className="t-label mb-2">// steps</div>
        <ol className="flex flex-col gap-1 text-[11px]">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? "text-[var(--color-accent)]" : i < step ? "text-[var(--color-fg-2)]" : "text-[var(--color-fg-4)]"}>
              {String(i + 1).padStart(2, "0")}/05 · {s.toLowerCase()}
            </li>
          ))}
        </ol>
      </aside>
      <div>
        {step === 0 && (
          <Panel><FormField label="PIPELINE NAME" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} placeholder="temp-rabbit" />
          </FormField></Panel>
        )}
        {step === 1 && (
          <Panel>
            <div className="t-label mb-2">// DATA SOURCE</div>
            <select className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full" {...form.register("data_source_id", { valueAsNumber: true })}>
              <option value="">— pick one —</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.sourceType})</option>)}
            </select>
            {form.formState.errors.data_source_id && <div className="text-[10px] text-[var(--color-danger)] mt-1">× {form.formState.errors.data_source_id.message}</div>}
          </Panel>
        )}
        {step === 2 && (
          <Panel>
            <div className="t-label mb-2">// VALIDATION SCHEMA</div>
            <select className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full" {...form.register("validation_schema_id", { valueAsNumber: true })}>
              <option value="">— pick one —</option>
              {schemas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {form.formState.errors.validation_schema_id && <div className="text-[10px] text-[var(--color-danger)] mt-1">× {form.formState.errors.validation_schema_id.message}</div>}
          </Panel>
        )}
        {step === 3 && (
          <Panel>
            <div className="t-label mb-2">// DATA STORE</div>
            <select className="bg-[var(--color-bg-panel)] border border-[#2a2a2a] text-[var(--color-fg-1)] px-3 py-[9px] text-[12px] font-mono rounded-[2px] w-full" {...form.register("data_store_id", { valueAsNumber: true })}>
              <option value="">— pick one —</option>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.persistenceType})</option>)}
            </select>
            {form.formState.errors.data_store_id && <div className="text-[10px] text-[var(--color-danger)] mt-1">× {form.formState.errors.data_store_id.message}</div>}
          </Panel>
        )}
        {step === 4 && (
          <Panel>
            <FormField label="REPLICATION (workers)" hint="how many concurrent replicas to run" error={form.formState.errors.replication?.message}>
              <Input type="number" min={1} max={64} {...form.register("replication", { valueAsNumber: true })} />
            </FormField>
          </Panel>
        )}

        <div className="flex gap-3 items-center mt-4">
          {step > 0 && <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>← back</Button>}
          {step < STEPS.length - 1 && <Button type="button" variant="primary" onClick={next}>next →</Button>}
          {step === STEPS.length - 1 && <Button type="submit" variant="primary" disabled={submitting}>+ CREATE PIPELINE</Button>}
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: New page**

```tsx
// web/app/(app)/pipelines/new/page.tsx
"use client";
import { useRouter } from "next/navigation";
import { PipelineWizard } from "@/components/forms/PipelineWizard";
import { useSources } from "@/lib/hooks/useSources";
import { useStores } from "@/lib/hooks/useStores";
import { useSchemas } from "@/lib/hooks/useSchemas";
import { useCreatePipeline } from "@/lib/hooks/usePipelines";

export default function NewPipelinePage() {
  const router = useRouter();
  const sources = useSources();
  const stores = useStores();
  const schemas = useSchemas();
  const create = useCreatePipeline();
  return (
    <div>
      <h1 className="t-title mb-1">new pipeline</h1>
      <p className="t-mono mb-6">// 5 steps to a working pipeline.</p>
      <PipelineWizard
        sources={sources.data ?? []}
        stores={stores.data ?? []}
        schemas={schemas.data ?? []}
        submitting={create.isPending}
        onSubmit={async (v) => { await create.mutateAsync(v); router.push("/pipelines"); }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/components/forms/PipelineWizard.tsx web/lib/schemas/pipeline.ts web/app/(app)/pipelines/new
git commit -m "web/pipelines: 5-step wizard"
```

---

### Task 29: Pipeline detail page

**Files:**
- Create: `web/app/(app)/pipelines/[id]/page.tsx`.

- [ ] **Step 1: Implement**

```tsx
// web/app/(app)/pipelines/[id]/page.tsx
"use client";
import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/ui/Panel";
import { Pill, type PillState } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { usePipeline } from "@/lib/hooks/usePipelines";
import { useStartPipeline } from "@/lib/hooks/useStartPipeline";
import { useStopPipeline } from "@/lib/hooks/useStopPipeline";
import { api } from "@/lib/api/client";
import type { PipelineStatus, DataSource, DataStore, ValidationSchema } from "@/lib/api/types";

function toPill(s?: string): PillState { if (s === "Running") return "running"; if (s === "Error") return "error"; return "idle"; }

export default function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const pid = Number(id);
  const { data: p } = usePipeline(pid);
  const { data: st } = useQuery({ queryKey: ["pipelines", "status", pid], queryFn: () => api<PipelineStatus>(`/pipeline-lifecycle/status/${pid}`), refetchInterval: 5000, enabled: pid > 0 });
  const source = useQuery({ queryKey: ["sources", p?.data_source_id], queryFn: () => api<DataSource>(`/data-sources/${p!.data_source_id}`), enabled: !!p?.data_source_id });
  const store  = useQuery({ queryKey: ["stores", p?.data_store_id], queryFn: () => api<DataStore>(`/data-stores/${p!.data_store_id}`), enabled: !!p?.data_store_id });
  const schema = useQuery({ queryKey: ["schemas", p?.validation_schema_id], queryFn: () => api<ValidationSchema>(`/validation-schemas/${p!.validation_schema_id}`), enabled: !!p?.validation_schema_id });
  const start = useStartPipeline(); const stop = useStopPipeline();

  if (!p) return <div className="t-mono">// loading…</div>;
  const running = st?.status === "Running";
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="t-title">{p.name}</h1>
        <Pill state={toPill(st?.status)}>{(st?.status ?? "STOPPED").toUpperCase()}</Pill>
      </div>
      <p className="t-mono mb-4">// pipeline #{String(p.id).padStart(2, "0")} · {p.replication} replicas</p>
      <div className="flex gap-3 items-center mb-6">
        {running
          ? <Button variant="danger" onClick={() => stop.mutate(p.id)}>■ STOP</Button>
          : <Button variant="primary" onClick={() => start.mutate(p.id)}>▸ START</Button>}
        <Link href="/pipelines"><Button variant="ghost">back</Button></Link>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Panel><div className="t-label">// SOURCE</div><div className="mt-1">{source.data?.name ?? <span className="text-[var(--color-fg-3)]">none</span>}</div></Panel>
        <Panel><div className="t-label">// SCHEMA</div><div className="mt-1">{schema.data?.name ?? <span className="text-[var(--color-fg-3)]">none</span>}</div></Panel>
        <Panel><div className="t-label">// STORE</div><div className="mt-1">{store.data?.name ?? <span className="text-[var(--color-fg-3)]">none</span>}</div></Panel>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit + tag end of Phase 7**

```bash
git add web/app/(app)/pipelines/[id]
git commit -m "web/pipelines: detail page with relations and lifecycle"
git tag phase-7-pipelines
```

---

## Phase 8 — Landing page

### Task 30: Landing hero + nav

**Files:**
- Modify: `web/app/page.tsx`.
- Create: `web/components/landing/Hero.tsx`, `MarketingNav.tsx`.
- Create: `web/app/(marketing)/layout.tsx` (optional; if simpler keep everything in `app/page.tsx`).

- [ ] **Step 1: MarketingNav**

```tsx
// web/components/landing/MarketingNav.tsx
import Link from "next/link";
export function MarketingNav() {
  return (
    <nav className="px-6 py-3 flex justify-between items-center text-[11px] font-mono border-b border-[var(--color-accent)]">
      <Link href="/" className="text-[var(--color-accent)] font-bold tracking-[2px]">iot-bee //</Link>
      <div className="flex gap-4 text-[var(--color-fg-3)]">
        <a href="#how" className="hover:text-[var(--color-fg-1)]">how it works</a>
        <a href="#arch" className="hover:text-[var(--color-fg-1)]">architecture</a>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[var(--color-fg-1)]">github ↗</a>
        <Link href="/login" className="text-[var(--color-accent)]">launch app →</Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Hero**

```tsx
// web/components/landing/Hero.tsx
import Link from "next/link";
export function Hero() {
  return (
    <section className="px-6 lg:px-12 py-16 lg:py-24 relative">
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ background: "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0,255,136,.05) 2px, rgba(0,255,136,.05) 3px)" }} />
      <div className="relative max-w-[1024px]">
        <span className="inline-block border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-0.5 text-[10px] tracking-[2px] mb-4">v0.1.0 · open source</span>
        <h1 className="font-mono font-bold text-[44px] sm:text-[60px] leading-[1.05] tracking-[-2px]">
          ingest. <span style={{ color: "var(--color-accent)" }}>validate.</span><br />
          persist. <span className="line-through text-[#555]">repeat.</span>
        </h1>
        <p className="t-mono mt-4 max-w-[600px]">
          // a rust iot pipeline.<br />
          // rabbitmq · mqtt · kafka in, influxdb out.<br />
          // actor-driven, schema-validated, self-hosted. zero magic.
        </p>
        <div className="flex flex-wrap gap-3 items-center mt-6">
          <Link href="/login" className="bg-[var(--color-accent)] text-[var(--color-bg-base)] font-bold px-4 py-2 text-[12px] rounded-[2px]">$ get started_</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="border border-[#333] text-[var(--color-fg-1)] px-4 py-2 text-[12px] rounded-[2px]">view on github</a>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 mt-10">
          <div><div className="t-mono">// per message</div><div className="t-display" style={{ fontSize: 28 }}>~0.4ms</div></div>
          <div><div className="t-mono">// brokers supported</div><div className="t-display" style={{ fontSize: 28 }}>3</div></div>
          <div><div className="t-mono">// replicas / pipeline</div><div className="t-display" style={{ fontSize: 28 }}>N</div></div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Wire the home page**

Replace `web/app/page.tsx`:
```tsx
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Hero } from "@/components/landing/Hero";

export default function Landing() {
  return (
    <>
      <MarketingNav />
      <Hero />
      {/* sections appended in next tasks */}
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/app/page.tsx web/components/landing
git commit -m "web/landing: nav + hero"
```

---

### Task 31: Landing — concept strip + three pillars

**Files:**
- Create: `web/components/landing/ConceptStrip.tsx`, `Pillars.tsx`.
- Modify: `web/app/page.tsx`.

- [ ] **Step 1: ConceptStrip**

```tsx
// web/components/landing/ConceptStrip.tsx
export function ConceptStrip() {
  return (
    <section className="border-y border-[#1f1f1f] px-6 lg:px-12 py-8">
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
        <span className="border border-[var(--color-fg-1)] px-3 py-2"><b>BROKER</b><br />rabbitmq · mqtt · kafka</span>
        <span className="text-[var(--color-accent)] text-lg">→</span>
        <span className="border border-[var(--color-fg-1)] px-3 py-2"><b>SCHEMA</b><br />validate · transform</span>
        <span className="text-[var(--color-accent)] text-lg">→</span>
        <span className="border border-[var(--color-fg-1)] px-3 py-2"><b>STORE</b><br />influxdb · local log</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Pillars**

```tsx
// web/components/landing/Pillars.tsx
import { Panel } from "@/components/ui/Panel";
export function Pillars() {
  const items = [
    { title: "INGEST", body: "// connect any broker.", code: `{ "host": "amqp://...", "queue": "sensor_data" }` },
    { title: "VALIDATE", body: "// schemas with min/max and arithmetic.", code: `{ "field_type": "float", "min": -50, "max": 150,\n  "operations": [{"operator": "Multiply", "operand": 1.8}] }` },
    { title: "PERSIST", body: "// influxdb tags + fields, or a flat log.", code: `{ "persistenceType": "INFLUX_DB",\n  "measurement": "temperature",\n  "tag_fields": ["location"] }` },
  ];
  return (
    <section className="px-6 lg:px-12 py-12 grid lg:grid-cols-3 gap-4">
      {items.map((it) => (
        <Panel key={it.title}>
          <div className="t-section mb-2">// {it.title.toLowerCase()}</div>
          <div className="t-body mb-4">{it.body}</div>
          <pre className="text-[10px] text-[var(--color-fg-3)] overflow-x-auto">{it.code}</pre>
        </Panel>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Update `web/app/page.tsx`**

```tsx
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Hero } from "@/components/landing/Hero";
import { ConceptStrip } from "@/components/landing/ConceptStrip";
import { Pillars } from "@/components/landing/Pillars";
export default function Landing() {
  return (<>
    <MarketingNav />
    <Hero />
    <ConceptStrip />
    <Pillars />
  </>);
}
```

- [ ] **Step 4: Commit**

```bash
git add web/components/landing web/app/page.tsx
git commit -m "web/landing: concept strip + pillars"
```

---

### Task 32: Landing — How it works (4 steps with mockups)

**Files:**
- Create: `web/components/landing/HowItWorks.tsx`.

- [ ] **Step 1: Implement (mockups use the same UI components as the app)**

```tsx
// web/components/landing/HowItWorks.tsx
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Pill } from "@/components/ui/Pill";

export function HowItWorks() {
  return (
    <section id="how" className="px-6 lg:px-12 py-16 border-t border-[#1f1f1f]">
      <h2 className="t-section mb-8">// how it works</h2>
      <div className="flex flex-col gap-16">
        <Step n={1} title="define a data source" body="// point iot-bee at your broker">
          <Panel className="max-w-[480px]">
            <FormField label="NAME"><Input value="temp-rabbit" readOnly /></FormField>
            <FormField label="QUEUE"><Input value="sensor.temperature" readOnly /></FormField>
          </Panel>
        </Step>
        <Step n={2} title="define the schema" body="// fields, ranges, transforms.">
          <Panel className="max-w-[480px]">
            <pre className="text-[10px] text-[var(--color-fg-2)]">{`{
  "name": "temp-schema",
  "fields": [
    { "name": "temperature",
      "field_type": "float",
      "min": -50, "max": 150,
      "operations": [
        { "operator": "Multiply", "operand": 1.8 },
        { "operator": "Add",      "operand": 32  }
      ]
    }
  ]
}`}</pre>
          </Panel>
        </Step>
        <Step n={3} title="connect a pipeline" body="// glue source + schema + store.">
          <div className="flex gap-3 max-w-[640px]">
            <Panel className="flex-1"><div className="t-label">// SOURCE</div><div>temp-rabbit</div></Panel>
            <Panel className="flex-1"><div className="t-label">// SCHEMA</div><div>temp-schema</div></Panel>
            <Panel className="flex-1"><div className="t-label">// STORE</div><div>influx-prod</div></Panel>
          </div>
        </Step>
        <Step n={4} title="start and monitor" body="// click start. watch throughput.">
          <Panel className="max-w-[480px] flex items-center justify-between">
            <div><div className="t-label">// THROUGHPUT</div><div className="t-display" style={{ fontSize: 28 }}>3.1k <span className="text-[var(--color-fg-3)] text-[12px]">msg/s</span></div></div>
            <Pill state="running">RUNNING</Pill>
          </Panel>
        </Step>
      </div>
    </section>
  );
}

function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[120px_320px_1fr] gap-6 items-start">
      <div className="t-display" style={{ fontSize: 48, color: "var(--color-accent)" }}>0{n}</div>
      <div>
        <h3 className="t-title mb-1">{title}</h3>
        <p className="t-mono">{body}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Wire and commit**

Append `<HowItWorks />` to `web/app/page.tsx`.
```bash
git add web/components/landing/HowItWorks.tsx web/app/page.tsx
git commit -m "web/landing: how it works (4 steps with mockups)"
```

---

### Task 33: Landing — Architecture peek + Self-host + Footer

**Files:**
- Create: `web/components/landing/Architecture.tsx`, `SelfHost.tsx`, `LandingFooter.tsx`.
- Modify: `web/app/page.tsx`.

- [ ] **Step 1: Architecture (inline SVG)**

```tsx
// web/components/landing/Architecture.tsx
export function Architecture() {
  return (
    <section id="arch" className="px-6 lg:px-12 py-16 border-t border-[#1f1f1f]">
      <h2 className="t-section mb-6">// architecture</h2>
      <p className="t-body max-w-[640px] mb-6">
        a top-level supervisor tracks one supervisor per pipeline. each pipeline spawns N replicas, each replica is a chain of three actors: consumer → processor → store.
      </p>
      <pre className="text-[11px] text-[var(--color-fg-2)] leading-snug overflow-x-auto">{`
SystemActorSupervisor
  └─ PipelineSupervisor (per pipeline)
        ├─ Replica 1: [consumer] → [processor] → [store]
        ├─ Replica 2: [consumer] → [processor] → [store]
        └─ Replica N: [consumer] → [processor] → [store]
`}</pre>
    </section>
  );
}
```

- [ ] **Step 2: SelfHost**

```tsx
// web/components/landing/SelfHost.tsx
export function SelfHost() {
  return (
    <section className="px-6 lg:px-12 py-16 border-t border-[#1f1f1f]">
      <h2 className="t-section mb-6">// self-host</h2>
      <pre className="text-[11px] text-[var(--color-accent)] bg-[var(--color-bg-panel)] border border-[#1f1f1f] p-4 rounded-[3px] overflow-x-auto">
{`$ git clone https://github.com/manuelmj/iot-bee.git
$ sqlx migrate run --database-url sqlite://data/iot-bee.db
$ make run`}
      </pre>
      <p className="t-mono mt-4">// MIT licensed · self-hosted · no telemetry</p>
    </section>
  );
}
```

- [ ] **Step 3: Footer**

```tsx
// web/components/landing/LandingFooter.tsx
export function LandingFooter() {
  return (
    <footer className="px-6 lg:px-12 py-6 border-t border-[#1f1f1f] text-[10px] tracking-[1.5px] text-[var(--color-fg-3)] font-mono flex flex-wrap justify-between gap-2">
      <span>MIT · v0.1.0</span>
      <span>github.com/manuelmj/iot-bee</span>
      <span>made by Manuel Manjarres Rivera</span>
    </footer>
  );
}
```

- [ ] **Step 4: Wire everything**

```tsx
// web/app/page.tsx
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Hero } from "@/components/landing/Hero";
import { ConceptStrip } from "@/components/landing/ConceptStrip";
import { Pillars } from "@/components/landing/Pillars";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Architecture } from "@/components/landing/Architecture";
import { SelfHost } from "@/components/landing/SelfHost";
import { LandingFooter } from "@/components/landing/LandingFooter";
export default function Landing() {
  return (<>
    <MarketingNav /><Hero /><ConceptStrip /><Pillars />
    <HowItWorks /><Architecture /><SelfHost /><LandingFooter />
  </>);
}
```

- [ ] **Step 5: Commit and tag end of Phase 8**

```bash
git add web/components/landing web/app/page.tsx
git commit -m "web/landing: architecture, self-host, footer"
git tag phase-8-landing
```

---

## Phase 9 — Responsive sweep, MSW unit tests, e2e, verification

### Task 34: Responsive sweep on the landing

**Files:** modify landing components as needed.

- [ ] **Step 1: Verify hero on mobile**

Run `cd web && pnpm dev`. Open `http://localhost:3000` in Chrome DevTools responsive mode @ iPhone SE (375×667).

Check:
- Nav doesn't overflow horizontally (it already wraps with `flex-wrap` not enabled — add `flex-wrap` to `MarketingNav`).
- Hero title (`text-[44px] sm:text-[60px]`) breaks correctly.
- Pillars grid stacks (Tailwind `lg:grid-cols-3` → already stacks).
- HowItWorks `lg:grid-cols-[120px_320px_1fr]` already collapses to one column on small screens (since it lacks a base `grid-cols-1`, add it: `grid grid-cols-1 lg:grid-cols-[120px_320px_1fr]`).

Apply fixes:
- `MarketingNav.tsx`: add `flex-wrap gap-y-2`.
- `HowItWorks.tsx`: add `grid-cols-1` to the inner `Step` grid.

- [ ] **Step 2: Sticky CTA on mobile**

Add to the Hero: when `window.innerWidth < 640`, the primary CTA repeats as a sticky bottom button. Implement with a media query helper or simply via CSS:

In `Hero.tsx`, add at the bottom of the returned JSX:
```tsx
<Link href="/login" className="fixed bottom-0 left-0 right-0 sm:hidden bg-[var(--color-accent)] text-[var(--color-bg-base)] text-center font-bold py-3 text-[12px] z-30">$ get started_</Link>
```
(z-30 so it sits above content but below modals.)

- [ ] **Step 3: Commit**

```bash
git add web/components/landing
git commit -m "web/landing: responsive fixes — wrap nav, stack steps, sticky CTA"
```

---

### Task 35: Responsive sweep on the app shell + tables

**Files:** modify `TopNav.tsx`, `CommandBar.tsx`, list pages.

- [ ] **Step 1: TopNav nav scrolls horizontally on small screens**

`TopNav.tsx` already has `overflow-x-auto` on `<nav>`. Verify on 375px width: tabs scroll. Add no-scrollbar utility if desired:

```tsx
<nav className="flex gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
```

- [ ] **Step 2: CommandBar becomes floating on mobile**

Update `CommandBar.tsx`'s collapsed button: on small screens, render a floating circle instead of the full-width bar. Replace the collapsed branch with:
```tsx
if (!open) {
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="hidden sm:block w-full bg-[var(--color-bg-panel)] border-b border-[#1f1f1f] px-4 py-2 text-left text-[11px] font-mono text-[var(--color-fg-3)] hover:text-[var(--color-fg-1)]">
        <span className="text-[var(--color-accent)] mr-2">$</span>
        run, navigate, search…
        <span className="float-right border border-[#333] px-1.5 text-[9px]">⌘K</span>
      </button>
      <button onClick={() => setOpen(true)}
        className="sm:hidden fixed bottom-4 right-4 z-30 bg-[var(--color-accent)] text-[var(--color-bg-base)] w-12 h-12 rounded-full font-bold text-[18px]">⌘</button>
    </>
  );
}
```

- [ ] **Step 3: Tables → stacked cards on mobile**

Apply to `pipelines/page.tsx`, `sources/page.tsx`, `stores/page.tsx`, `schemas/page.tsx`, `groups/page.tsx`, overview.

Wrap the `<Table>` in `<div className="hidden md:block">` and add a parallel `<div className="md:hidden flex flex-col gap-2">` rendering each row as a `Panel` card.

Example for `pipelines/page.tsx` (apply same pattern across modules):
```tsx
{/* desktop */}
<div className="hidden md:block">
  <Table>...</Table>
</div>
{/* mobile */}
<div className="md:hidden flex flex-col gap-2">
  {list.map((p) => (
    <Panel key={p.id}>
      <div className="flex justify-between items-start mb-2">
        <div><div className="t-label">// #{String(p.id).padStart(2, "0")}</div><div className="font-bold">{p.name}</div></div>
        <Pill state={toPill(stMap.get(p.id))}>{(stMap.get(p.id) ?? "STOPPED").toUpperCase()}</Pill>
      </div>
      <div className="t-mono mb-2">{p.replication} replicas</div>
      <div className="flex gap-2">
        {/* same start/stop/delete buttons */}
      </div>
    </Panel>
  ))}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add web/components/shell web/app/(app)
git commit -m "web/app: mobile-responsive (floating ⌘K, stacked card tables)"
```

---

### Task 36: MSW handlers and component-level tests

**Files:**
- Create: `web/test/msw/{handlers.ts, server.ts}`.
- Create: `web/components/ui/__tests__/FormField.test.tsx`, hooks tests.

- [ ] **Step 1: MSW handlers**

```ts
// web/test/msw/handlers.ts
import { http, HttpResponse } from "msw";
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const handlers = [
  http.get(`${BASE}/data-sources`, () => HttpResponse.json([
    { id: 1, name: "temp-rabbit", sourceType: "RABBIT_MQ", config: { host: "x", queue: "y" } },
  ])),
  http.get(`${BASE}/pipeline-lifecycle/status`, () => HttpResponse.json([
    { pipeline_id: 1, pipeline_name: "temp-rabbit", status: "Running", replicas: 2 },
  ])),
];
```

```ts
// web/test/msw/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";
export const server = setupServer(...handlers);
```

Update `web/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
import { server } from "./msw/server";
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 2: FormField test**

```tsx
// web/components/ui/__tests__/FormField.test.tsx
import { render, screen } from "@testing-library/react";
import { FormField } from "../FormField";

describe("FormField", () => {
  it("renders label with // prefix", () => {
    render(<FormField label="NAME"><input /></FormField>);
    expect(screen.getByText("// NAME")).toBeInTheDocument();
  });
  it("renders error in danger color", () => {
    render(<FormField label="X" error="required"><input /></FormField>);
    expect(screen.getByText(/× required/)).toBeInTheDocument();
  });
  it("renders hint when no error", () => {
    render(<FormField label="X" hint="ex"><input /></FormField>);
    expect(screen.getByText("ex")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: useSources hook test**

```tsx
// web/lib/hooks/__tests__/useSources.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSources } from "../useSources";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useSources", () => {
  it("returns the MSW-stubbed list", async () => {
    const { result } = renderHook(() => useSources(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("temp-rabbit");
  });
});
```

- [ ] **Step 4: Run all tests**

```bash
cd web && pnpm test
```
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add web/test web/components/ui/__tests__/FormField.test.tsx web/lib/hooks/__tests__
git commit -m "web/test: MSW handlers + FormField/useSources tests"
```

---

### Task 37: Playwright e2e happy path

**Files:**
- Create: `web/playwright.config.ts`, `web/test/e2e/happy-path.spec.ts`.

- [ ] **Step 1: Config**

```ts
// web/playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 2: Spec**

```ts
// web/test/e2e/happy-path.spec.ts
import { test, expect } from "@playwright/test";

test("register → login → create source → create store → create schema → create pipeline → start", async ({ page }) => {
  // Assumption: backend started fresh with empty users table.
  await page.goto("/login");
  await expect(page.getByText(/create admin account/i)).toBeVisible();
  await page.getByPlaceholder(/you@host/).fill("admin@example.com");
  await page.getByPlaceholder(/ovidio/).fill("Admin");
  await page.getByPlaceholder(/≥ 8 chars/).fill("secret123");
  await page.getByRole("button", { name: /CREATE ADMIN/ }).click();

  await page.waitForURL(/\/app/);

  // create source
  await page.goto("/sources/new");
  await page.getByPlaceholder("amqp://localhost:5672").fill("amqp://localhost:5672");
  await page.locator("input").first().fill("e2e-source");
  await page.getByPlaceholder(/queue/i).fill("e2e-q"); // adjust if no placeholder
  await page.getByRole("button", { name: /CREATE SOURCE/ }).click();
  await expect(page).toHaveURL(/\/sources/);

  // create store
  await page.goto("/stores/new");
  await page.locator("input").first().fill("e2e-store");
  await page.getByPlaceholder(/log/i).fill("e2e-log");
  await page.getByRole("button", { name: /CREATE/ }).click();
  await expect(page).toHaveURL(/\/stores/);

  // create schema
  await page.goto("/schemas/new");
  await page.locator("input").first().fill("e2e-schema");
  await page.locator('input[name*="name"]').nth(1).fill("temperature");
  await page.getByRole("button", { name: /CREATE SCHEMA/ }).click();
  await expect(page).toHaveURL(/\/schemas/);

  // create pipeline (wizard)
  await page.goto("/pipelines/new");
  await page.locator("input").first().fill("e2e-pipeline");
  await page.getByRole("button", { name: /next/ }).click();
  await page.locator("select").selectOption({ label: /e2e-source/ });
  await page.getByRole("button", { name: /next/ }).click();
  await page.locator("select").selectOption({ label: /e2e-schema/ });
  await page.getByRole("button", { name: /next/ }).click();
  await page.locator("select").selectOption({ label: /e2e-store/ });
  await page.getByRole("button", { name: /next/ }).click();
  await page.getByRole("button", { name: /CREATE PIPELINE/ }).click();
  await expect(page).toHaveURL(/\/pipelines/);

  // start
  await page.getByRole("button", { name: /▸ start/ }).first().click();
  await expect(page.getByText(/RUNNING/)).toBeVisible({ timeout: 10_000 });
});
```

> **Note:** start a fresh backend (delete `data/iot-bee.db`, run migrations) before running the e2e suite, otherwise the first-admin flow won't trigger.

- [ ] **Step 3: Install browsers**

```bash
cd web && pnpm exec playwright install chromium
```

- [ ] **Step 4: Run e2e**

```bash
# in another terminal: rm data/iot-bee.db && sqlx migrate run --database-url sqlite://data/iot-bee.db
# then start backend with JWT_SECRET=devsecret cargo run
cd web && pnpm test:e2e
```
Expected: spec passes.

- [ ] **Step 5: Commit**

```bash
git add web/playwright.config.ts web/test/e2e
git commit -m "web/e2e: Playwright happy-path covering full pipeline lifecycle"
```

---

### Task 38: Final verification + clippy + docs

**Files:** none, but update README to reference the web app.

- [ ] **Step 1: Backend check**

```bash
JWT_SECRET=devsecret cargo test
cargo clippy --workspace -- -D warnings
```
Expected: all green.

- [ ] **Step 2: Frontend check**

```bash
cd web && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
Expected: all green; `pnpm build` succeeds.

- [ ] **Step 3: Manual smoke checklist (run through each)**

- [ ] backend up, front up
- [ ] open `http://localhost:3000` — landing renders
- [ ] open in 375px viewport — landing readable, sticky CTA shows
- [ ] `/login` shows "create admin account" on a fresh DB
- [ ] register → redirect to `/app`
- [ ] create source → list shows it
- [ ] create store → list shows it
- [ ] create schema (with at least one field) → list shows it
- [ ] create pipeline via wizard → list shows it
- [ ] click ▸ start → status flips to RUNNING within 5s (poll)
- [ ] click ■ stop → status flips to STOPPED
- [ ] ⌘K opens command bar; `go pipelines` navigates
- [ ] logout → back to `/login`; `/login` now shows "login" not "create admin"
- [ ] CORS: DevTools shows no warnings for cross-origin

- [ ] **Step 4: README update**

Add a section to root `README.md`:
```markdown
## Web UI

The Next.js web app lives in `web/`. Start it after the backend:

```bash
cd web
cp .env.local.example .env.local
pnpm install
pnpm dev   # http://localhost:3000
```

The first user registered becomes the admin; subsequent open registrations are disabled.
```

- [ ] **Step 5: Commit and tag end of Phase 9**

```bash
git add README.md
git commit -m "docs: reference the web app in README"
git tag phase-9-verified
```

---

## Self-review notes

A fresh pass over the plan confirmed:

- Every section of the spec maps to at least one task (auth/Section-4 → Tasks 1–9; visual system §5 → Tasks 11–12; landing §6 → Tasks 30–33; app pages §7 → Tasks 17–29; API client §8 → Tasks 13–14, 17; testing §9 → Tasks 3, 4, 5, 6, 9, 12, 36, 37, 38).
- Type/method names are consistent: `JwtAuth` middleware, `AuthUseCases` trait, `authApi.login` / `register` / `hasUsers` / `me`, `useSources` / `useStores` / `useSchemas` / `useGroups` / `usePipelines`, `usePipelineStatusAll`, `useStartPipeline` / `useStopPipeline`.
- Buttons rule (same size in a row, `btn-tiny` only inline) is honored — table action buttons render directly as `<button>` with shared styling, not by mixing `Button` variants.
- The Argon2/JWT/Postgres-free dependency choices match the workspace conventions (sqlx + sqlite, chrono, serde already present).
- The proxy route handler (`/api/proxy/[...path]`) closes the loop on the HttpOnly-cookie decision from the spec.
- YAGNI items (refresh tokens, multi-tenant, 2FA, i18n, SSE) remain out of scope.

