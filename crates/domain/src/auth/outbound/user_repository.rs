use async_trait::async_trait;

use crate::auth::entities::user::{NewUser, User};
use crate::error::AuthError;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn count(&self) -> Result<i64, AuthError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError>;
    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError>;
    async fn create(&self, new_user: NewUser) -> Result<User, AuthError>;

    async fn list_by_org(&self, organization_id: i64) -> Result<Vec<User>, AuthError>;
    async fn update_role(&self, id: i64, role: &str) -> Result<(), AuthError>;
    async fn set_status(&self, id: i64, status: &str) -> Result<(), AuthError>;
    async fn update_name(&self, id: i64, name: &str) -> Result<(), AuthError>;
    async fn create_as_admin(&self, new_user: NewUser) -> Result<User, AuthError>;
}
