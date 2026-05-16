use actix_web::{HttpMessage, HttpRequest, HttpResponse, get, web};

use domain::audit::entities::audit_event::AuditFilter;
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::IoTBeeError;

use super::models::{AuditEventResponse, AuditListQuery, AuditListResponse};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn AuditUseCases + Send + Sync;

#[utoipa::path(
    get,
    path = "/admin/audit",
    params(AuditListQuery),
    responses(
        (status = 200, description = "Audit events", body = AuditListResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("")]
pub async fn list(
    req: HttpRequest,
    q: web::Query<AuditListQuery>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let claims = req
        .extensions()
        .get::<JwtClaims>()
        .cloned()
        .ok_or_else(|| {
            ApiError(IoTBeeError::AuthError(
                domain::error::AuthError::InvalidToken,
            ))
        })?;

    let mut filter = AuditFilter::default();
    filter.organization_id = Some(claims.organization_id);
    filter.user_id = q.user_id;
    filter.method = q.method.clone();
    filter.path_contains = q.path_contains.clone();
    filter.status_code = q.status;
    filter.from = q.from;
    filter.to = q.to;

    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    let page = uc
        .list(filter, q.cursor, limit)
        .await
        .map_err(|e| ApiError(IoTBeeError::AuditError(e)))?;

    let resp = AuditListResponse {
        items: page
            .items
            .into_iter()
            .map(|e| AuditEventResponse {
                id: e.id,
                organization_id: e.organization_id,
                user_id: e.user_id,
                user_email: e.user_email,
                user_role: e.user_role,
                action: e.action,
                method: e.method,
                path: e.path,
                status_code: e.status_code,
                ip_address: e.ip_address,
                created_at: e.created_at.to_rfc3339(),
            })
            .collect(),
        next_cursor: page.next_cursor,
    };
    Ok(HttpResponse::Ok().json(resp))
}
