use actix_web::{HttpMessage, HttpRequest, HttpResponse, delete, get, patch, post, web};

use domain::auth::value_objects::claims::JwtClaims;
use domain::error::{IoTBeeError, PlanError};
use domain::plan::entities::plan::{NewPlan, Plan, UpdatePlan};
use domain::plan::inbound::plan_uses::PlanUseCases;

use super::models::{CreatePlanRequest, PatchPlanRequest, PlanListResponse, PlanResponse};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn PlanUseCases + Send + Sync;

fn to_resp(p: Plan) -> PlanResponse {
    PlanResponse {
        id: p.id,
        slug: p.slug,
        organization_id: p.organization_id,
        display_name: p.display_name,
        description: p.description,
        price_cents: p.price_cents,
        currency: p.currency,
        max_pipelines: p.max_pipelines,
        max_replicas_per_pipeline: p.max_replicas_per_pipeline,
        included_messages_monthly: p.included_messages_monthly,
        alerts_enabled: p.alerts_enabled,
        premium_connectors: p.premium_connectors,
        multi_user: p.multi_user,
        is_custom: p.is_custom,
        stripe_price_id: p.stripe_price_id,
        created_at: p.created_at.to_rfc3339(),
        updated_at: p.updated_at.to_rfc3339(),
    }
}

fn claims(req: &HttpRequest) -> Result<JwtClaims, ApiError> {
    req.extensions().get::<JwtClaims>().cloned().ok_or_else(|| {
        ApiError(IoTBeeError::AuthError(
            domain::error::AuthError::InvalidToken,
        ))
    })
}

#[utoipa::path(get, path = "/admin/plans",
    responses(
        (status = 200, description = "Plans visible to caller's org", body = PlanListResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin")]
#[get("")]
pub async fn list(req: HttpRequest, uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let plans = uc
        .list(c.organization_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::PlanError(e)))?;
    Ok(HttpResponse::Ok().json(PlanListResponse {
        items: plans.into_iter().map(to_resp).collect(),
    }))
}

#[utoipa::path(post, path = "/admin/plans",
    request_body = CreatePlanRequest,
    responses(
        (status = 201, description = "Created", body = PlanResponse),
        (status = 400, description = "Invalid", body = ErrorResponse),
        (status = 409, description = "Slug taken", body = ErrorResponse),
    ),
    tag = "Admin")]
#[post("")]
pub async fn create(
    req: HttpRequest,
    body: web::Json<CreatePlanRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let b = body.into_inner();
    if b.organization_id.is_some_and(|id| id != c.organization_id) {
        return Err(ApiError(IoTBeeError::AuthError(
            domain::error::AuthError::Forbidden,
        )));
    }
    let is_custom = b.is_custom || b.organization_id.is_some();
    let p = uc
        .create(NewPlan {
            slug: b.slug,
            organization_id: is_custom.then_some(c.organization_id),
            display_name: b.display_name,
            description: b.description,
            price_cents: b.price_cents,
            currency: b.currency,
            max_pipelines: b.max_pipelines,
            max_replicas_per_pipeline: b.max_replicas_per_pipeline,
            included_messages_monthly: b.included_messages_monthly,
            alerts_enabled: b.alerts_enabled,
            premium_connectors: b.premium_connectors,
            multi_user: b.multi_user,
            is_custom,
            stripe_price_id: b.stripe_price_id,
        })
        .await
        .map_err(|e| ApiError(IoTBeeError::PlanError(e)))?;
    Ok(HttpResponse::Created().json(to_resp(p)))
}

#[utoipa::path(patch, path = "/admin/plans/{id}",
    request_body = PatchPlanRequest,
    responses(
        (status = 200, description = "Updated", body = PlanResponse),
        (status = 400, description = "Invalid", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
    ),
    tag = "Admin")]
#[patch("/{id}")]
pub async fn patch_plan(
    req: HttpRequest,
    path: web::Path<i64>,
    body: web::Json<PatchPlanRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let id = path.into_inner();
    if !uc
        .list(c.organization_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::PlanError(e)))?
        .iter()
        .any(|plan| plan.id == id)
    {
        return Err(ApiError(IoTBeeError::PlanError(PlanError::NotFound { id })));
    }
    let b = body.into_inner();
    let p = uc
        .update(
            id,
            UpdatePlan {
                display_name: b.display_name,
                description: b.description,
                price_cents: b.price_cents,
                currency: b.currency,
                max_pipelines: b.max_pipelines,
                max_replicas_per_pipeline: b.max_replicas_per_pipeline,
                included_messages_monthly: b.included_messages_monthly,
                alerts_enabled: b.alerts_enabled,
                premium_connectors: b.premium_connectors,
                multi_user: b.multi_user,
                stripe_price_id: b.stripe_price_id,
            },
        )
        .await
        .map_err(|e| ApiError(IoTBeeError::PlanError(e)))?;
    Ok(HttpResponse::Ok().json(to_resp(p)))
}

#[utoipa::path(delete, path = "/admin/plans/{id}",
    responses(
        (status = 204, description = "Deleted"),
        (status = 400, description = "Cannot delete fallback plan", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
    ),
    tag = "Admin")]
#[delete("/{id}")]
pub async fn delete_plan(
    req: HttpRequest,
    path: web::Path<i64>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let id = path.into_inner();
    if !uc
        .list(c.organization_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::PlanError(e)))?
        .iter()
        .any(|plan| plan.id == id)
    {
        return Err(ApiError(IoTBeeError::PlanError(PlanError::NotFound { id })));
    }
    uc.delete(id)
        .await
        .map_err(|e| ApiError(IoTBeeError::PlanError(e)))?;
    Ok(HttpResponse::NoContent().finish())
}
