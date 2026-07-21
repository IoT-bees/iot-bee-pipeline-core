use std::sync::Arc;

use application::auth_cases::cases::AuthUseCasesImpl;
use application::notifications_cases::cases::NotificationsUseCases;
use async_trait::async_trait;
use domain::auth::entities::user::{NewUser, User};
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::token_issuer::TokenIssuer;
use domain::auth::outbound::user_repository::UserRepository;
use domain::auth::value_objects::claims::JwtClaims;
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

struct StubRepo {
    user: User,
}

#[async_trait]
impl UserRepository for StubRepo {
    async fn count(&self) -> Result<i64, AuthError> {
        Ok(1)
    }
    async fn find_by_email(&self, _: &str) -> Result<Option<User>, AuthError> {
        Ok(Some(self.user.clone()))
    }
    async fn find_by_id(&self, _: i64) -> Result<Option<User>, AuthError> {
        Ok(Some(self.user.clone()))
    }
    async fn find_admin_by_org_id(&self, _: i64) -> Result<Option<User>, AuthError> {
        Ok(Some(self.user.clone()))
    }
    async fn create(&self, _: NewUser) -> Result<User, AuthError> {
        unreachable!()
    }
    async fn list_by_org(&self, _: i64) -> Result<Vec<User>, AuthError> {
        unreachable!()
    }
    async fn update_role(&self, _: i64, _: &str) -> Result<(), AuthError> {
        unreachable!()
    }
    async fn set_status(&self, _: i64, _: &str) -> Result<(), AuthError> {
        unreachable!()
    }
    async fn update_name(&self, _: i64, _: &str) -> Result<(), AuthError> {
        unreachable!()
    }
    async fn set_must_reset_password(&self, _: i64, _: bool) -> Result<(), AuthError> {
        unreachable!()
    }
    async fn create_as_admin(&self, _: NewUser) -> Result<User, AuthError> {
        unreachable!()
    }
}

struct StubHasher;

#[async_trait]
impl PasswordHasher for StubHasher {
    fn hash(&self, _: &str) -> Result<String, AuthError> {
        Ok("hash".into())
    }
    fn verify(&self, _: &str, _: &str) -> Result<bool, AuthError> {
        Ok(true)
    }
}

struct StubIssuer;

impl TokenIssuer for StubIssuer {
    fn issue(&self, _: i64, _: i64, _: &str, _: &str) -> Result<String, AuthError> {
        Ok("t".into())
    }
    fn verify(&self, _: &str) -> Result<JwtClaims, AuthError> {
        unreachable!()
    }
}

fn make_user(status: &str) -> User {
    User {
        id: 1,
        organization_id: 1,
        email: "u@x.test".into(),
        name: "u".into(),
        password_hash: "h".into(),
        role: "admin".into(),
        status: status.into(),
        must_reset_password: false,
        created_at: chrono::Utc::now(),
    }
}

#[tokio::test]
async fn login_rejects_suspended_user() {
    let repo = Arc::new(StubRepo {
        user: make_user("suspended"),
    });
    let cases = AuthUseCasesImpl::new(
        repo,
        Arc::new(StubHasher),
        Arc::new(StubIssuer),
        Arc::new(NoopNotifications),
    );
    let result = cases.login("u@x.test".into(), "pw".into()).await;
    assert!(matches!(result, Err(AuthError::InvalidCredentials)));
}

#[tokio::test]
async fn login_accepts_active_user() {
    let repo = Arc::new(StubRepo {
        user: make_user("active"),
    });
    let cases = AuthUseCasesImpl::new(
        repo,
        Arc::new(StubHasher),
        Arc::new(StubIssuer),
        Arc::new(NoopNotifications),
    );
    let result = cases.login("u@x.test".into(), "pw".into()).await;
    assert!(result.is_ok());
}
