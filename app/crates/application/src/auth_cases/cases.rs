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
use logging::AppLogger;

use crate::notifications_cases::cases::NotificationsUseCases;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::auth_cases::cases");

pub struct AuthUseCasesImpl {
    repo: Arc<dyn UserRepository>,
    hasher: Arc<dyn PasswordHasher>,
    issuer: Arc<dyn TokenIssuer>,
    notifications: Arc<dyn NotificationsUseCases>,
}

impl AuthUseCasesImpl {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        hasher: Arc<dyn PasswordHasher>,
        issuer: Arc<dyn TokenIssuer>,
        notifications: Arc<dyn NotificationsUseCases>,
    ) -> Self {
        Self {
            repo,
            hasher,
            issuer,
            notifications,
        }
    }

    fn check_password_strength(password: &str) -> Result<(), AuthError> {
        if password.len() < 8 {
            return Err(AuthError::WeakPassword {
                reason: "must be at least 8 characters".into(),
            });
        }
        Ok(())
    }
}

#[async_trait]
impl AuthUseCases for AuthUseCasesImpl {
    async fn register(
        &self,
        email: String,
        name: String,
        password: String,
    ) -> Result<(User, String), AuthError> {
        if self.repo.count().await? > 0 {
            return Err(AuthError::RegistrationDisabled);
        }
        Self::check_password_strength(&password)?;
        let email = Email::parse(email)?.into_string();
        if self.repo.find_by_email(&email).await?.is_some() {
            return Err(AuthError::EmailAlreadyTaken { email });
        }
        let password_hash = self.hasher.hash(&password)?;
        let user = self
            .repo
            .create(NewUser {
                organization_id: 1,
                email: email.clone(),
                name,
                password_hash,
                role: "admin".into(),
                status: "active".into(),
                must_reset_password: false,
            })
            .await?;
        let token = self
            .issuer
            .issue(user.id, user.organization_id, &user.email, &user.role)?;

        let notifications = self.notifications.clone();
        let invite_to = user.email.clone();
        let inviter_name = user.name.clone();
        tokio::spawn(async move {
            if let Err(e) = notifications
                .send_invite(&invite_to, &inviter_name, "https://app.iotbees.dev/")
                .await
            {
                LOGGER.warn(&format!("invite email failed: {e}"));
            }
        });

        Ok((user, token))
    }

    async fn login(&self, email: String, password: String) -> Result<(User, String), AuthError> {
        let email = Email::parse(email)?.into_string();
        let user = self
            .repo
            .find_by_email(&email)
            .await?
            .ok_or(AuthError::InvalidCredentials)?;
        if user.status != "active" {
            return Err(AuthError::InvalidCredentials);
        }
        if !self.hasher.verify(&password, &user.password_hash)? {
            return Err(AuthError::InvalidCredentials);
        }
        let token = self
            .issuer
            .issue(user.id, user.organization_id, &user.email, &user.role)?;
        Ok((user, token))
    }

    async fn verify_token(&self, token: &str) -> Result<JwtClaims, AuthError> {
        self.issuer.verify(token)
    }

    async fn get_user(&self, user_id: i64) -> Result<User, AuthError> {
        self.repo
            .find_by_id(user_id)
            .await?
            .ok_or(AuthError::InvalidCredentials)
    }

    async fn has_users(&self) -> Result<bool, AuthError> {
        Ok(self.repo.count().await? > 0)
    }
}
