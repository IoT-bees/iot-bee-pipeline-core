use application::notifications_cases::cases::NotificationsUseCases;
use application::user_admin_cases::cases::UserAdminUseCasesImpl;
use async_trait::async_trait;
use chrono::Utc;
use domain::auth::entities::user::{NewUser, User};
use domain::auth::inbound::user_admin_uses::{CreateUserAsAdminInput, UserAdminUseCases};
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::user_repository::UserRepository;
use domain::error::{AuthError, IoTBeeError};
use std::sync::Arc;

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
    async fn send_suspension(&self, _: &str, _: &str) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

struct FakeRepo;

#[async_trait]
impl UserRepository for FakeRepo {
    async fn count(&self) -> Result<i64, AuthError> {
        Ok(0)
    }

    async fn find_by_email(&self, _: &str) -> Result<Option<User>, AuthError> {
        Ok(None)
    }

    async fn find_by_id(&self, _: i64) -> Result<Option<User>, AuthError> {
        Ok(None)
    }

    async fn find_admin_by_org_id(&self, _: i64) -> Result<Option<User>, AuthError> {
        Ok(None)
    }

    async fn create(&self, new_user: NewUser) -> Result<User, AuthError> {
        Ok(User {
            id: 1,
            organization_id: new_user.organization_id,
            email: new_user.email,
            name: new_user.name,
            password_hash: new_user.password_hash,
            role: new_user.role,
            status: new_user.status,
            must_reset_password: new_user.must_reset_password,
            created_at: Utc::now(),
        })
    }

    async fn list_by_org(&self, _: i64) -> Result<Vec<User>, AuthError> {
        Ok(vec![])
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

    async fn set_must_reset_password(&self, _: i64, _: bool) -> Result<(), AuthError> {
        Ok(())
    }

    async fn create_as_admin(&self, new_user: NewUser) -> Result<User, AuthError> {
        Ok(User {
            id: 2,
            organization_id: new_user.organization_id,
            email: new_user.email,
            name: new_user.name,
            password_hash: new_user.password_hash,
            role: new_user.role,
            status: new_user.status,
            must_reset_password: new_user.must_reset_password,
            created_at: Utc::now(),
        })
    }
}

struct FakeHasher;

impl PasswordHasher for FakeHasher {
    fn hash(&self, plain: &str) -> Result<String, AuthError> {
        Ok(format!("hashed:{plain}"))
    }

    fn verify(&self, plain: &str, hash: &str) -> Result<bool, AuthError> {
        Ok(hash == format!("hashed:{plain}"))
    }
}

fn cases() -> UserAdminUseCasesImpl {
    UserAdminUseCasesImpl::new(
        Arc::new(FakeRepo),
        Arc::new(FakeHasher),
        Arc::new(NoopNotifications),
    )
}

#[tokio::test]
async fn create_user_accepts_viewer_role() {
    let result = cases()
        .create(CreateUserAsAdminInput {
            organization_id: 1,
            email: "viewer@example.com".into(),
            name: "Viewer User".into(),
            role: "viewer".into(),
            temp_password: "password123".into(),
        })
        .await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap().role, "viewer");
}

#[tokio::test]
async fn create_user_rejects_unknown_role() {
    let result = cases()
        .create(CreateUserAsAdminInput {
            organization_id: 1,
            email: "ghost@example.com".into(),
            name: "Ghost".into(),
            role: "ghost".into(),
            temp_password: "password123".into(),
        })
        .await;
    assert!(result.is_err());
}

#[tokio::test]
async fn create_user_accepts_admin_role() {
    let result = cases()
        .create(CreateUserAsAdminInput {
            organization_id: 1,
            email: "admin@example.com".into(),
            name: "Admin User".into(),
            role: "admin".into(),
            temp_password: "password123".into(),
        })
        .await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn create_user_accepts_operator_role() {
    let result = cases()
        .create(CreateUserAsAdminInput {
            organization_id: 1,
            email: "op@example.com".into(),
            name: "Operator User".into(),
            role: "operator".into(),
            temp_password: "password123".into(),
        })
        .await;
    assert!(result.is_ok());
}
