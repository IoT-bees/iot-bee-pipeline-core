use argon2::password_hash::{SaltString, rand_core::OsRng};
use argon2::{Argon2, PasswordHash, PasswordHasher as Argon2PasswordHasher, PasswordVerifier};

use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::error::AuthError;

pub struct Argon2Hasher;

impl Argon2Hasher {
    pub fn new() -> Self {
        Self
    }
}

impl Default for Argon2Hasher {
    fn default() -> Self {
        Self::new()
    }
}

impl PasswordHasher for Argon2Hasher {
    fn hash(&self, plain: &str) -> Result<String, AuthError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let phc =
            argon2
                .hash_password(plain.as_bytes(), &salt)
                .map_err(|e| AuthError::Internal {
                    reason: e.to_string(),
                })?;
        Ok(phc.to_string())
    }

    fn verify(&self, plain: &str, hash: &str) -> Result<bool, AuthError> {
        let parsed = PasswordHash::new(hash).map_err(|e| AuthError::Internal {
            reason: e.to_string(),
        })?;
        Ok(Argon2::default()
            .verify_password(plain.as_bytes(), &parsed)
            .is_ok())
    }
}
