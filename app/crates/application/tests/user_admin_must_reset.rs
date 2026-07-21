use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use application::notifications_cases::cases::NotificationsUseCases;
use application::user_admin_cases::cases::UserAdminUseCasesImpl;
use async_trait::async_trait;
use chrono::Utc;
use domain::auth::entities::user::{NewUser, User};
use domain::auth::inbound::user_admin_uses::{UpdateUserInput, UserAdminUseCases};
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::user_repository::UserRepository;
use domain::error::{AuthError, IoTBeeError};

struct NoopNotifications;

#[async_trait]
impl NotificationsUseCases for NoopNotifications {
    async fn send_invite(&self, _: &str, _: &str, _: &str) -> Result<(), IoTBeeError> {
        Ok(())
    }
    async fn send_password_reset(&self, _: &str, _: &str) -> Result<(), IoTBeeError> {
        Ok(())
    }
    async fn send_payment_failed(&self, _: &str, _: &str, _: &str) -> Result<(), IoTBeeError> {
        Ok(())
    }
    async fn send_usage_quota(&self, _: &str, _: u64, _: u64) -> Result<(), IoTBeeError> {
        Ok(())
    }
    async fn send_suspension(&self, _: &str, _: &str) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

struct MockRepo {
    must_reset_called: AtomicBool,
    last_value: std::sync::Mutex<Option<bool>>,
}

impl MockRepo {
    fn new() -> Self {
        Self {
            must_reset_called: AtomicBool::new(false),
            last_value: std::sync::Mutex::new(None),
        }
    }
}

fn fake_user(must_reset: bool) -> User {
    User {
        id: 42,
        organization_id: 1,
        email: "u@x.test".into(),
        name: "u".into(),
        password_hash: "h".into(),
        role: "operator".into(),
        status: "active".into(),
        must_reset_password: must_reset,
        created_at: Utc::now(),
    }
}

#[async_trait]
impl UserRepository for MockRepo {
    async fn count(&self) -> Result<i64, AuthError> {
        Ok(1)
    }
    async fn find_by_email(&self, _: &str) -> Result<Option<User>, AuthError> {
        Ok(None)
    }
    async fn find_by_id(&self, _: i64) -> Result<Option<User>, AuthError> {
        Ok(Some(fake_user(
            self.last_value.lock().unwrap().unwrap_or(false),
        )))
    }
    async fn create(&self, _: NewUser) -> Result<User, AuthError> {
        unreachable!()
    }
    async fn list_by_org(&self, _: i64) -> Result<Vec<User>, AuthError> {
        Ok(vec![])
    }
    async fn find_admin_by_org_id(&self, _: i64) -> Result<Option<User>, AuthError> {
        Ok(None)
    }
    async fn update_role(&self, _: i64, _: &str) -> Result<(), AuthError> {
        Ok(())
    }
    async fn set_status(&self, _: i64, _: &str) -> Result<(), AuthError> {
        Ok(())
    }
    async fn update_name(&self, _: i64, _: &str) -> Result<(), AuthError> {
        Ok(())
    }
    async fn set_must_reset_password(&self, _: i64, must_reset: bool) -> Result<(), AuthError> {
        self.must_reset_called.store(true, Ordering::SeqCst);
        *self.last_value.lock().unwrap() = Some(must_reset);
        Ok(())
    }
    async fn create_as_admin(&self, _: NewUser) -> Result<User, AuthError> {
        unreachable!()
    }
}

struct StubHasher;

impl PasswordHasher for StubHasher {
    fn hash(&self, _: &str) -> Result<String, AuthError> {
        Ok("h".into())
    }
    fn verify(&self, _: &str, _: &str) -> Result<bool, AuthError> {
        Ok(true)
    }
}

#[tokio::test]
async fn must_reset_password_flows_through_to_repo() {
    let repo = Arc::new(MockRepo::new());
    let cases = UserAdminUseCasesImpl::new(
        repo.clone(),
        Arc::new(StubHasher),
        Arc::new(NoopNotifications),
    );

    let updated = cases
        .update(
            1,
            42,
            UpdateUserInput {
                must_reset_password: Some(true),
                ..Default::default()
            },
        )
        .await
        .expect("update should succeed");

    assert!(repo.must_reset_called.load(Ordering::SeqCst));
    assert_eq!(*repo.last_value.lock().unwrap(), Some(true));
    assert!(updated.must_reset_password);
}

#[tokio::test]
async fn omitting_must_reset_password_does_not_touch_repo() {
    let repo = Arc::new(MockRepo::new());
    let cases = UserAdminUseCasesImpl::new(
        repo.clone(),
        Arc::new(StubHasher),
        Arc::new(NoopNotifications),
    );

    let _ = cases
        .update(
            1,
            42,
            UpdateUserInput {
                name: Some("new".into()),
                ..Default::default()
            },
        )
        .await
        .expect("update should succeed");

    assert!(!repo.must_reset_called.load(Ordering::SeqCst));
}
