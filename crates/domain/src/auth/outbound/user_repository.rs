use async_trait::async_trait;

use crate::auth::entities::user::{NewUser, User};
use crate::error::AuthError;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn count(&self) -> Result<i64, AuthError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError>;
    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError>;
    async fn create(&self, new_user: NewUser) -> Result<User, AuthError>;
}
