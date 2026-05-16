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
