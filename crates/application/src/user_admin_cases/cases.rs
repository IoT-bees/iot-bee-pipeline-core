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
use logging::AppLogger;

use crate::notifications_cases::cases::NotificationsUseCases;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::user_admin_cases::cases");

const ALLOWED_ROLES: &[&str] = &["admin", "operator", "viewer"];
const ALLOWED_STATUSES: &[&str] = &["active", "disabled"];

pub struct UserAdminUseCasesImpl {
    repo: Arc<dyn UserRepository>,
    hasher: Arc<dyn PasswordHasher>,
    notifications: Arc<dyn NotificationsUseCases>,
}

impl UserAdminUseCasesImpl {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        hasher: Arc<dyn PasswordHasher>,
        notifications: Arc<dyn NotificationsUseCases>,
    ) -> Self {
        Self {
            repo,
            hasher,
            notifications,
        }
    }

    fn check_role(role: &str) -> Result<(), UserAdminError> {
        if ALLOWED_ROLES.contains(&role) {
            Ok(())
        } else {
            Err(UserAdminError::InvalidRole { role: role.into() })
        }
    }

    fn check_status(status: &str) -> Result<(), UserAdminError> {
        if ALLOWED_STATUSES.contains(&status) {
            Ok(())
        } else {
            Err(UserAdminError::InvalidStatus {
                status: status.into(),
            })
        }
    }

    fn check_password(p: &str) -> Result<(), UserAdminError> {
        if p.len() < 8 {
            return Err(UserAdminError::WeakPassword {
                reason: "must be at least 8 characters".into(),
            });
        }
        Ok(())
    }
}

fn map_auth_err(e: AuthError) -> UserAdminError {
    match e {
        AuthError::EmailAlreadyTaken { email } => UserAdminError::EmailTaken { email },
        AuthError::Internal { reason } => UserAdminError::Internal { reason },
        other => UserAdminError::Internal {
            reason: format!("{}", other),
        },
    }
}

#[async_trait]
impl UserAdminUseCases for UserAdminUseCasesImpl {
    async fn list(&self, organization_id: i64) -> Result<Vec<User>, UserAdminError> {
        self.repo
            .list_by_org(organization_id)
            .await
            .map_err(map_auth_err)
    }

    async fn create(&self, input: CreateUserAsAdminInput) -> Result<User, UserAdminError> {
        Self::check_role(&input.role)?;
        Self::check_password(&input.temp_password)?;
        let email = Email::parse(input.email.clone())
            .map_err(|_| UserAdminError::Internal {
                reason: "invalid email".into(),
            })?
            .into_string();
        if self
            .repo
            .find_by_email(&email)
            .await
            .map_err(map_auth_err)?
            .is_some()
        {
            return Err(UserAdminError::EmailTaken { email });
        }
        let password_hash =
            self.hasher
                .hash(&input.temp_password)
                .map_err(|e| UserAdminError::Internal {
                    reason: format!("{}", e),
                })?;
        self.repo
            .create_as_admin(NewUser {
                organization_id: input.organization_id,
                email,
                name: input.name,
                password_hash,
                role: input.role,
                status: "active".into(),
                must_reset_password: true,
            })
            .await
            .map_err(map_auth_err)
    }

    async fn update(
        &self,
        caller_id: i64,
        id: i64,
        input: UpdateUserInput,
    ) -> Result<User, UserAdminError> {
        let touches_role_or_status = input.role.is_some() || input.status.is_some();
        if caller_id == id && touches_role_or_status {
            return Err(UserAdminError::CannotChangeSelfRoleOrStatus);
        }
        if let Some(role) = input.role.as_deref() {
            Self::check_role(role)?;
            self.repo
                .update_role(id, role)
                .await
                .map_err(map_auth_err)?;
        }
        if let Some(status) = input.status.as_deref() {
            Self::check_status(status)?;
            self.repo
                .set_status(id, status)
                .await
                .map_err(map_auth_err)?;
        }
        if let Some(name) = input.name.as_deref() {
            self.repo
                .update_name(id, name)
                .await
                .map_err(map_auth_err)?;
        }
        if let Some(must_reset) = input.must_reset_password {
            self.repo
                .set_must_reset_password(id, must_reset)
                .await
                .map_err(map_auth_err)?;
        }
        let user = self
            .repo
            .find_by_id(id)
            .await
            .map_err(map_auth_err)?
            .ok_or(UserAdminError::NotFound { id })?;
        Ok(user)
    }

    async fn deactivate(&self, caller_id: i64, target_id: i64) -> Result<(), UserAdminError> {
        if caller_id == target_id {
            return Err(UserAdminError::CannotDeactivateSelf);
        }
        let target = self
            .repo
            .find_by_id(target_id)
            .await
            .map_err(map_auth_err)?
            .ok_or(UserAdminError::NotFound { id: target_id })?;
        self.repo
            .set_status(target_id, "disabled")
            .await
            .map_err(map_auth_err)?;

        let notifications = self.notifications.clone();
        let email = target.email.clone();
        tokio::spawn(async move {
            if let Err(e) = notifications
                .send_suspension(&email, "manual deactivation")
                .await
            {
                LOGGER.warn(format!("suspension email failed: {e}"));
            }
        });

        Ok(())
    }
}
