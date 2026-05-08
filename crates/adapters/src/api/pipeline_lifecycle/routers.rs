use crate::api::error::ApiError;
use crate::api::error::ErrorResponse;

use actix_web::{HttpResponse, post, web};
use application::pipeline_lifecycle_cases::cases::PipelineLifecycleCases;

use logging::AppLogger;

type UseCase = dyn PipelineLifecycleCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::pipeline_lifecycle::routers");

pub fn pipeline_lifecycle_scope(use_case: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/pipeline-lifecycle")
        .app_data(use_case)
        .service(start_new_pipeline)
        .service(stop_pipeline)
}

#[utoipa::path(
    post,
    path = "/pipeline-lifecycle/start/{pipeline_id}",
    responses(
        (status = 200, description = "Pipeline started successfully"),
        (status = 400, description = "Invalid pipeline ID", body = ErrorResponse),
        (status = 404, description = "Pipeline not found", body = ErrorResponse)
    ),
    tag = "Pipeline Lifecycle"
)]
#[post("/start/{pipeline_id}")]
pub async fn start_new_pipeline(
    use_case: web::Data<UseCase>,
    pipeline_id : web::Path<u32>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("start_new_pipeline handler called");

    let pipeline_id = pipeline_id.into_inner();
    LOGGER.info(&format!("el pipeline id recibido por el endpoint es {}",pipeline_id.clone()));
    use_case
        .start_new_pipeline(pipeline_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to start pipeline: {e}"));
            e
        })?;
    LOGGER.info("Pipeline started successfully");
    Ok(HttpResponse::Ok().finish())
}



#[utoipa::path(
    post,
    path = "/pipeline-lifecycle/stop/{pipeline_id}",
    responses(
        (status = 200, description = "Pipeline stopped successfully"),
        (status = 400, description = "Invalid pipeline ID", body = ErrorResponse),
        (status = 404, description = "Pipeline not found", body = ErrorResponse)
    ),
    tag = "Pipeline Lifecycle"
)]
#[post("/stop/{pipeline_id}")]
pub async fn stop_pipeline(
    use_case: web::Data<UseCase>,
    pipeline_id : web::Path<u32>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("stop_pipeline handler called");
    let pipeline_id = pipeline_id.into_inner();
    LOGGER.info(&format!("el pipeline id recibido por el endpoint es {}",pipeline_id.clone()));
    use_case
        .stop_pipeline(pipeline_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to stop pipeline: {e}"));
            e
        })?;
    LOGGER.info("Pipeline stopped successfully");
    Ok(HttpResponse::Ok().finish())
}
