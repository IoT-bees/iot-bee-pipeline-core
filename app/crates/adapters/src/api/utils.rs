use actix_web::{HttpMessage, HttpRequest};
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::{AuthError, IoTBeeError};

use crate::api::error::ApiError;

/// Extract the organization id from the JWT claims attached to the request by
/// the authentication middleware. Returns 401 when no claims are present, which
/// is the right answer for any handler that ought to be behind auth.
pub fn require_org_id(req: &HttpRequest) -> Result<i64, ApiError> {
    req.extensions()
        .get::<JwtClaims>()
        .map(|c| c.organization_id)
        .ok_or_else(|| ApiError(IoTBeeError::AuthError(AuthError::InvalidToken)))
}

/// Restringe administración de organización, planes y facturación al rol admin.
/// Los recursos operativos se controlan por `RolePolicy` en el borde HTTP.
pub fn require_admin(req: &HttpRequest) -> Result<(), ApiError> {
    let is_admin = req
        .extensions()
        .get::<JwtClaims>()
        .is_some_and(|claims| claims.role == "admin");
    if is_admin {
        Ok(())
    } else {
        Err(ApiError(IoTBeeError::AuthError(AuthError::Forbidden)))
    }
}
