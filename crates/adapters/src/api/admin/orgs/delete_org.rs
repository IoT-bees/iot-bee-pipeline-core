use actix_web::{HttpRequest, HttpResponse, delete, web};

use domain::error::IoTBeeError;
use domain::organization::inbound::organization_uses::OrganizationUseCases;

use crate::api::error::{ApiError, ErrorResponse};

type OrgUc = dyn OrganizationUseCases + Send + Sync;

const CONFIRM_HEADER: &str = "x-confirm";
const CONFIRM_VALUE: &str = "yes-i-am-sure";

#[delete("/{id}")]
pub async fn delete_org(
    req: HttpRequest,
    path: web::Path<i64>,
    uc: web::Data<OrgUc>,
) -> Result<HttpResponse, ApiError> {
    let provided = req
        .headers()
        .get(CONFIRM_HEADER)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    if provided != CONFIRM_VALUE {
        return Ok(HttpResponse::Forbidden().json(ErrorResponse {
            error: format!(
                "missing or invalid {} header (expected '{}')",
                CONFIRM_HEADER, CONFIRM_VALUE
            ),
        }));
    }

    let id = path.into_inner();
    uc.delete_cascade(id)
        .await
        .map_err(|e| ApiError(IoTBeeError::OrganizationError(e)))?;
    Ok(HttpResponse::NoContent().finish())
}
