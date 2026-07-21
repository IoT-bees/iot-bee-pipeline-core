use crate::api::error::{ApiError, ErrorResponse};
use crate::api::license::models::{
    ActivateLicenseRequest, LicenseStatusResponse, StripeBillingSyncRequest,
};
use crate::api::utils::{require_admin, require_org_id};
use actix_web::{HttpRequest, HttpResponse, get, post, web};
use application::license_cases::cases::LicenseUseCases;
use application::pipeline_data_cases::cases::PipelineDataUseCases;
use logging::AppLogger;

type LicenseUseCase = dyn LicenseUseCases + Send + Sync;
type PipelineUseCase = dyn PipelineDataUseCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::license::routers");

pub fn license_scope(
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
) -> actix_web::Scope {
    web::scope("/license")
        .app_data(license_use_case)
        .app_data(pipeline_use_case)
        .service(get_license_status)
        .service(activate_license)
        .service(deactivate_license)
        .service(sync_stripe_billing)
}

#[utoipa::path(
    get,
    path = "/license/status",
    responses(
        (status = 200, description = "License status", body = LicenseStatusResponse),
        (status = 400, description = "Invalid license state", body = ErrorResponse)
    ),
    tag = "License"
)]
#[get("/status")]
pub async fn get_license_status(
    req: HttpRequest,
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("get_license_status handler called");
    let org_id = require_org_id(&req)?;
    let pipeline_count = pipeline_use_case.get_pipeline(org_id).await?.len() as u32;
    let status = license_use_case.status(org_id, pipeline_count).await?;
    Ok(HttpResponse::Ok().json(LicenseStatusResponse::from(status)))
}

#[utoipa::path(
    post,
    path = "/license/activate",
    request_body = ActivateLicenseRequest,
    responses(
        (status = 200, description = "License activated", body = LicenseStatusResponse),
        (status = 400, description = "Invalid license key", body = ErrorResponse)
    ),
    tag = "License"
)]
#[post("/activate")]
pub async fn activate_license(
    req: HttpRequest,
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
    body: web::Json<ActivateLicenseRequest>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("activate_license handler called");
    require_admin(&req)?;
    let org_id = require_org_id(&req)?;
    let pipeline_count = pipeline_use_case.get_pipeline(org_id).await?.len() as u32;
    let status = license_use_case
        .activate(org_id, &body.license_key, pipeline_count)
        .await?;
    Ok(HttpResponse::Ok().json(LicenseStatusResponse::from(status)))
}

#[utoipa::path(
    post,
    path = "/license/deactivate",
    responses(
        (status = 200, description = "License deactivated", body = LicenseStatusResponse),
        (status = 400, description = "Invalid license state", body = ErrorResponse)
    ),
    tag = "License"
)]
#[post("/deactivate")]
pub async fn deactivate_license(
    req: HttpRequest,
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("deactivate_license handler called");
    require_admin(&req)?;
    let org_id = require_org_id(&req)?;
    let pipeline_count = pipeline_use_case.get_pipeline(org_id).await?.len() as u32;
    let status = license_use_case.deactivate(org_id, pipeline_count).await?;
    Ok(HttpResponse::Ok().json(LicenseStatusResponse::from(status)))
}

/// Parse a Stripe `client_reference_id` of the form `org:<i64>` into an org id.
/// El contexto de organización es obligatorio para evitar activar una licencia
/// de otro tenant con un evento mal formado.
fn parse_client_reference_org(client_reference_id: Option<&str>) -> Option<i64> {
    let raw = client_reference_id?.trim();
    let rest = raw.strip_prefix("org:")?;
    rest.parse::<i64>()
        .ok()
        .filter(|organization_id| *organization_id > 0)
}

#[post("/stripe-sync")]
pub async fn sync_stripe_billing(
    req: HttpRequest,
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
    body: web::Bytes,
) -> Result<HttpResponse, ApiError> {
    require_admin(&req)?;
    let expected_secret = std::env::var("STRIPE_SYNC_SECRET").unwrap_or_default();
    let provided_secret = req
        .headers()
        .get("x-stripe-sync-secret")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    if expected_secret.is_empty() || provided_secret != expected_secret {
        return Ok(HttpResponse::Unauthorized().json(ErrorResponse {
            error: "invalid stripe sync secret".to_string(),
        }));
    }

    // Parse once as a generic Value so we can both extract org from
    // `clientReferenceId`/`client_reference_id` AND build the typed payload.
    let raw_payload: serde_json::Value = serde_json::from_slice(&body).map_err(|error| {
        ApiError::from(domain::error::IoTBeeError::from(
            domain::error::LicenseError::Persistence {
                reason: format!("invalid stripe sync payload: {error}"),
            },
        ))
    })?;
    let client_ref = raw_payload
        .get("clientReferenceId")
        .or_else(|| raw_payload.get("client_reference_id"))
        .and_then(|v| v.as_str());
    let org_id = parse_client_reference_org(client_ref).ok_or_else(|| {
        ApiError::from(domain::error::IoTBeeError::from(
            domain::error::LicenseError::Persistence {
                reason: "missing or invalid Stripe organization context".into(),
            },
        ))
    })?;

    let body: StripeBillingSyncRequest = serde_json::from_value(raw_payload).map_err(|error| {
        ApiError::from(domain::error::IoTBeeError::from(
            domain::error::LicenseError::Persistence {
                reason: format!("invalid stripe sync payload: {error}"),
            },
        ))
    })?;
    let sync = body.try_into()?;
    let pipeline_count = pipeline_use_case.get_pipeline(org_id).await?.len() as u32;
    let status = license_use_case
        .sync_stripe_subscription(org_id, &sync, pipeline_count)
        .await?;
    Ok(HttpResponse::Ok().json(LicenseStatusResponse::from(status)))
}
