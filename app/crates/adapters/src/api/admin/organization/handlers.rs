use actix_web::{HttpMessage, HttpRequest, HttpResponse, get, patch, web};

use domain::auth::value_objects::claims::JwtClaims;
use domain::error::IoTBeeError;
use domain::organization::entities::organization::{Organization, UpdateOrganization};
use domain::organization::inbound::organization_uses::OrganizationUseCases;

use super::models::{OrganizationResponse, PatchOrganizationRequest};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn OrganizationUseCases + Send + Sync;

fn to_resp(o: Organization) -> OrganizationResponse {
    OrganizationResponse {
        id: o.id,
        name: o.name,
        slug: o.slug,
        created_at: o.created_at.to_rfc3339(),
        updated_at: o.updated_at.to_rfc3339(),
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
    path = "/admin/organization",
    responses(
        (status = 200, description = "Org", body = OrganizationResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("")]
pub async fn read(req: HttpRequest, uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let org = uc
        .read(c.organization_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::OrganizationError(e)))?;
    Ok(HttpResponse::Ok().json(to_resp(org)))
}

#[utoipa::path(
    patch,
    path = "/admin/organization",
    request_body = PatchOrganizationRequest,
    responses(
        (status = 200, description = "Updated", body = OrganizationResponse),
        (status = 409, description = "Slug taken", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[patch("")]
pub async fn patch(
    req: HttpRequest,
    body: web::Json<PatchOrganizationRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let body = body.into_inner();
    let org = uc
        .update(
            c.organization_id,
            UpdateOrganization {
                name: body.name,
                slug: body.slug,
            },
        )
        .await
        .map_err(|e| ApiError(IoTBeeError::OrganizationError(e)))?;
    Ok(HttpResponse::Ok().json(to_resp(org)))
}
