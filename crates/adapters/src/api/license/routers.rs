use crate::api::error::{ApiError, ErrorResponse};
use crate::api::license::models::{
    ActivateLicenseRequest, LicenseStatusResponse, StripeBillingSyncRequest,
};
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
}

pub fn stripe_license_sync_scope(
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
) -> actix_web::Scope {
    web::scope("/internal/stripe")
        .app_data(license_use_case)
        .app_data(pipeline_use_case)
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
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("get_license_status handler called");
    let pipeline_count = pipeline_use_case.get_pipeline().await?.len() as u32;
    let status = license_use_case.status(pipeline_count).await?;
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
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
    body: web::Json<ActivateLicenseRequest>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("activate_license handler called");
    let pipeline_count = pipeline_use_case.get_pipeline().await?.len() as u32;
    let status = license_use_case
        .activate(&body.license_key, pipeline_count)
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
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("deactivate_license handler called");
    let pipeline_count = pipeline_use_case.get_pipeline().await?.len() as u32;
    let status = license_use_case.deactivate(pipeline_count).await?;
    Ok(HttpResponse::Ok().json(LicenseStatusResponse::from(status)))
}

#[post("/license-sync")]
pub async fn sync_stripe_billing(
    req: HttpRequest,
    license_use_case: web::Data<LicenseUseCase>,
    pipeline_use_case: web::Data<PipelineUseCase>,
    body: web::Bytes,
) -> Result<HttpResponse, ApiError> {
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

    let pipeline_count = pipeline_use_case.get_pipeline().await?.len() as u32;
    let body: StripeBillingSyncRequest = serde_json::from_slice(&body).map_err(|error| {
        ApiError::from(domain::error::IoTBeeError::from(
            domain::error::LicenseError::Persistence {
                reason: format!("invalid stripe sync payload: {error}"),
            },
        ))
    })?;
    let sync = body.try_into()?;
    let status = license_use_case
        .sync_stripe_subscription(&sync, pipeline_count)
        .await?;
    Ok(HttpResponse::Ok().json(LicenseStatusResponse::from(status)))
}
