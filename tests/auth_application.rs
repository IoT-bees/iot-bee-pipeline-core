use std::sync::Mutex;

use async_trait::async_trait;
use chrono::Utc;

use application::auth_cases::cases::AuthUseCasesImpl;
use domain::auth::entities::user::{NewUser, User};
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::token_issuer::TokenIssuer;
use domain::auth::outbound::user_repository::UserRepository;
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::AuthError;
use std::sync::Arc;

#[derive(Default)]
struct InMemRepo {
    users: Mutex<Vec<User>>,
    next_id: Mutex<i64>,
}

#[async_trait]
impl UserRepository for InMemRepo {
    async fn count(&self) -> Result<i64, AuthError> {
        Ok(self.users.lock().unwrap().len() as i64)
    }
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError> {
        Ok(self
            .users
            .lock()
            .unwrap()
            .iter()
            .find(|u| u.email == email)
            .cloned())
    }
    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError> {
        Ok(self
            .users
            .lock()
            .unwrap()
            .iter()
            .find(|u| u.id == id)
            .cloned())
    }
    async fn create(&self, new_user: NewUser) -> Result<User, AuthError> {
        let mut id = self.next_id.lock().unwrap();
        *id += 1;
        let user = User {
            id: *id,
            email: new_user.email,
            name: new_user.name,
            password_hash: new_user.password_hash,
            role: new_user.role,
            created_at: Utc::now(),
        };
        self.users.lock().unwrap().push(user.clone());
        Ok(user)
    }
}

struct StubHasher;
impl PasswordHasher for StubHasher {
    fn hash(&self, plain: &str) -> Result<String, AuthError> {
        Ok(format!("hash:{plain}"))
    }
    fn verify(&self, plain: &str, hash: &str) -> Result<bool, AuthError> {
        Ok(hash == format!("hash:{plain}"))
    }
}

struct StubIssuer;
impl TokenIssuer for StubIssuer {
    fn issue(&self, user_id: i64, email: &str, role: &str) -> Result<String, AuthError> {
        Ok(format!("token:{user_id}:{email}:{role}"))
    }
    fn verify(&self, token: &str) -> Result<JwtClaims, AuthError> {
        let parts: Vec<&str> = token.splitn(4, ':').collect();
        if parts.len() != 4 || parts[0] != "token" {
            return Err(AuthError::InvalidToken);
        }
        Ok(JwtClaims {
            user_id: parts[1].parse().unwrap(),
            email: parts[2].into(),
            role: parts[3].into(),
            issued_at: Utc::now(),
            expires_at: Utc::now(),
        })
    }
}

fn make() -> AuthUseCasesImpl {
    AuthUseCasesImpl::new(
        Arc::new(InMemRepo::default()),
        Arc::new(StubHasher),
        Arc::new(StubIssuer),
    )
}

#[tokio::test]
async fn first_register_succeeds_and_returns_token() {
    let uc = make();
    let (user, token) = uc
        .register("a@b.com".into(), "Ana".into(), "secret123".into())
        .await
        .unwrap();
    assert_eq!(user.email, "a@b.com");
    assert!(token.starts_with("token:"));
}

#[tokio::test]
async fn second_register_is_disabled() {
    let uc = make();
    uc.register("a@b.com".into(), "Ana".into(), "secret123".into())
        .await
        .unwrap();
    let err = uc
        .register("c@d.com".into(), "Carl".into(), "secret456".into())
        .await
        .unwrap_err();
    assert!(matches!(err, AuthError::RegistrationDisabled));
}

#[tokio::test]
async fn login_with_correct_password_succeeds() {
    let uc = make();
    uc.register("a@b.com".into(), "Ana".into(), "secret123".into())
        .await
        .unwrap();
    let (user, _) = uc
        .login("a@b.com".into(), "secret123".into())
        .await
        .unwrap();
    assert_eq!(user.email, "a@b.com");
}

#[tokio::test]
async fn login_with_wrong_password_fails() {
    let uc = make();
    uc.register("a@b.com".into(), "Ana".into(), "secret123".into())
        .await
        .unwrap();
    let err = uc
        .login("a@b.com".into(), "WRONG".into())
        .await
        .unwrap_err();
    assert!(matches!(err, AuthError::InvalidCredentials));
}

#[tokio::test]
async fn weak_password_rejected() {
    let uc = make();
    let err = uc
        .register("a@b.com".into(), "Ana".into(), "abc".into())
        .await
        .unwrap_err();
    assert!(matches!(err, AuthError::WeakPassword { .. }));
}
