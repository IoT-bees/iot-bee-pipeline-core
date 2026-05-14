use async_trait::async_trait;

use crate::auth::entities::user::User;
use crate::auth::value_objects::claims::JwtClaims;
use crate::error::AuthError;

#[async_trait]
pub trait AuthUseCases: Send + Sync {
    async fn register(
        &self,
        email: String,
        name: String,
        password: String,
    ) -> Result<(User, String), AuthError>;

    async fn login(
        &self,
        email: String,
        password: String,
    ) -> Result<(User, String), AuthError>;

    async fn verify_token(&self, token: &str) -> Result<JwtClaims, AuthError>;

    async fn get_user(&self, user_id: i64) -> Result<User, AuthError>;

    async fn has_users(&self) -> Result<bool, AuthError>;
}
