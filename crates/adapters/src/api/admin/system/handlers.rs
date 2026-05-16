use actix_web::{HttpResponse, get, web};

use domain::error::IoTBeeError;
use domain::system::inbound::system_uses::SystemUseCases;

use super::models::{BuildResponse, DependencyResponse, RuntimeResponse, SystemStatusResponse};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn SystemUseCases + Send + Sync;

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
