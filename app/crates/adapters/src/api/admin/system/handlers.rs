use actix_web::{HttpResponse, get, patch, web};

use domain::error::IoTBeeError;
use domain::system::entities::contact_settings::{ContactSettings, UpdateContactSettings};
use domain::system::inbound::system_uses::SystemUseCases;

use super::models::{
    BuildResponse, ContactSettingsResponse, DependencyResponse, RuntimeResponse,
    SystemStatusResponse, UpdateContactSettingsRequest,
};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn SystemUseCases + Send + Sync;

fn contact_settings_response(settings: ContactSettings) -> ContactSettingsResponse {
    ContactSettingsResponse {
        contact_email: settings.contact_email,
        whatsapp_number: settings.whatsapp_number,
    }
}

#[utoipa::path(
    get,
    path = "/admin/system/status",
    responses(
        (status = 200, description = "System status", body = SystemStatusResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("/status")]
pub async fn status(uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let s = uc
        .status()
        .await
        .map_err(|e| ApiError(IoTBeeError::SystemError(e)))?;
    let resp = SystemStatusResponse {
        probed_at: s.probed_at.to_rfc3339(),
        dependencies: s
            .dependencies
            .into_iter()
            .map(|d| DependencyResponse {
                name: d.name,
                configured: d.configured,
                ok: d.ok,
                latency_ms: d.latency_ms,
                error: d.error,
            })
            .collect(),
        runtime: RuntimeResponse {
            configured_pipelines: s.runtime.configured_pipelines,
            live_replicas: s.runtime.live_replicas,
            msgs_last_hour: s.runtime.msgs_last_hour,
        },
        build: BuildResponse {
            commit: s.build.commit,
            build_time: s.build.build_time,
            uptime_seconds: s.build.uptime_seconds,
        },
    };
    Ok(HttpResponse::Ok().json(resp))
}

#[utoipa::path(
    get,
    path = "/admin/system/contact-settings",
    responses(
        (status = 200, description = "Contact settings", body = ContactSettingsResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("/contact-settings")]
pub async fn contact_settings(uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let settings = uc
        .contact_settings()
        .await
        .map_err(|e| ApiError(IoTBeeError::SystemError(e)))?;
    Ok(HttpResponse::Ok().json(contact_settings_response(settings)))
}

#[utoipa::path(
    patch,
    path = "/admin/system/contact-settings",
    request_body = UpdateContactSettingsRequest,
    responses(
        (status = 200, description = "Contact settings updated", body = ContactSettingsResponse),
        (status = 400, description = "Invalid contact settings", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[patch("/contact-settings")]
pub async fn update_contact_settings(
    body: web::Json<UpdateContactSettingsRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let body = body.into_inner();
    let settings = uc
        .update_contact_settings(UpdateContactSettings {
            contact_email: body.contact_email,
            whatsapp_number: body.whatsapp_number,
        })
        .await
        .map_err(|e| ApiError(IoTBeeError::SystemError(e)))?;
    Ok(HttpResponse::Ok().json(contact_settings_response(settings)))
}
