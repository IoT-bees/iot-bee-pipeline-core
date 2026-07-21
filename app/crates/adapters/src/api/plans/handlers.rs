use actix_web::{HttpMessage, HttpRequest, HttpResponse, get, web};

use domain::auth::value_objects::claims::JwtClaims;
use domain::error::IoTBeeError;
use domain::plan::inbound::plan_uses::PlanUseCases;

use crate::api::admin::plans::models::{PlanListResponse, PlanResponse};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn PlanUseCases + Send + Sync;

fn plan_to_resp(p: domain::plan::entities::plan::Plan) -> PlanResponse {
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

#[utoipa::path(
    get,
    path = "/plans",
    responses(
        (status = 200, description = "Plans visible to caller's org", body = PlanListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
    ),
    tag = "Plans"
)]
#[get("")]
pub async fn list(req: HttpRequest, uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let plans = uc
        .list(c.organization_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::PlanError(e)))?;
    Ok(HttpResponse::Ok().json(PlanListResponse {
        items: plans.into_iter().map(plan_to_resp).collect(),
    }))
}
