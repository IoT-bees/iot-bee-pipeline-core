use actix_web::{HttpRequest, HttpResponse, get, post, web};
use serde::Deserialize;

use application::license_cases::cases::LicenseUseCases;

use super::models::{BillingEventResponse, BillingEventsListResponse};
use crate::api::error::{ApiError, ErrorResponse};
use crate::api::utils::require_org_id;

type UseCase = dyn LicenseUseCases + Send + Sync;

#[derive(Deserialize)]
pub struct ListQuery {
    pub limit: Option<i64>,
    pub cursor: Option<i64>,
}

#[utoipa::path(
    get,
    path = "/admin/billing/events",
    responses(
        (status = 200, description = "Billing events", body = BillingEventsListResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("")]
pub async fn list(
    req: HttpRequest,
    q: web::Query<ListQuery>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let q = q.into_inner();
    let (items, next_cursor) = uc
        .list_billing_events_page(
            require_org_id(&req)?,
            q.cursor,
            q.limit.unwrap_or(50).clamp(1, 200),
        )
        .await?;
    Ok(HttpResponse::Ok().json(BillingEventsListResponse {
        items: items.into_iter().map(BillingEventResponse::from).collect(),
        next_cursor,
    }))
}

#[utoipa::path(
    post,
    path = "/admin/billing/events/{id}/retry",
    responses(
        (status = 200, description = "Retry attempted", body = BillingEventResponse),
        (status = 400, description = "Invalid payload", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[post("/{id}/retry")]
pub async fn retry(
    req: HttpRequest,
    path: web::Path<i64>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let id = path.into_inner();
    let event = uc
        .retry_billing_event(require_org_id(&req)?, id)
        .await
        .map_err(ApiError)?;
    Ok(HttpResponse::Ok().json(BillingEventResponse::from(event)))
}
