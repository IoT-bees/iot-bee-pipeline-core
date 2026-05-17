use crate::auth::value_objects::claims::JwtClaims;
use crate::error::AuthError;

pub trait TokenIssuer: Send + Sync {
    fn issue(
        &self,
        user_id: i64,
        organization_id: i64,
        email: &str,
        role: &str,
    ) -> Result<String, AuthError>;
    fn verify(&self, token: &str) -> Result<JwtClaims, AuthError>;
}
