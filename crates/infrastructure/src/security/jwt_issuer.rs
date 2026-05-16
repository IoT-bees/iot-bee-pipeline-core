use chrono::{Duration, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

use domain::auth::outbound::token_issuer::TokenIssuer;
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::AuthError;

#[derive(Debug, Serialize, Deserialize)]
struct InternalClaims {
    sub: String,
    email: String,
    role: String,
    iat: i64,
    exp: i64,
}

pub struct JwtIssuer {
    secret: String,
    ttl_hours: i64,
}

impl JwtIssuer {
    pub fn new(secret: String, ttl_hours: i64) -> Self {
        Self { secret, ttl_hours }
    }
}

impl TokenIssuer for JwtIssuer {
    fn issue(&self, user_id: i64, email: &str, role: &str) -> Result<String, AuthError> {
        let now = Utc::now();
        let exp = now + Duration::hours(self.ttl_hours);
        let claims = InternalClaims {
            sub: user_id.to_string(),
            email: email.to_string(),
            role: role.to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
        };
        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )
        .map_err(|e| AuthError::Internal {
            reason: e.to_string(),
        })
    }

    fn verify(&self, token: &str) -> Result<JwtClaims, AuthError> {
        let data = decode::<InternalClaims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        )
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AuthError::ExpiredToken,
            _ => AuthError::InvalidToken,
        })?;
        let c = data.claims;
        Ok(JwtClaims {
            user_id: c.sub.parse().map_err(|_| AuthError::InvalidToken)?,
            email: c.email,
            role: c.role,
            issued_at: chrono::DateTime::from_timestamp(c.iat, 0).ok_or(AuthError::InvalidToken)?,
            expires_at: chrono::DateTime::from_timestamp(c.exp, 0)
                .ok_or(AuthError::InvalidToken)?,
        })
    }
}
