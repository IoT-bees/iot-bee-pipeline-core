use crate::error::AuthError;

pub trait PasswordHasher: Send + Sync {
    fn hash(&self, plain: &str) -> Result<String, AuthError>;
    fn verify(&self, plain: &str, hash: &str) -> Result<bool, AuthError>;
}
