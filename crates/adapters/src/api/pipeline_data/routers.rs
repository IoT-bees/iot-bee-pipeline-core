use crate::api::pipeline_data::models::{
    CreatePipelineDataRequest, PipelineDataId, PipelineDataResponse,
};
use actix_web::{HttpResponse, get, post, web};
use application::pipeline_data_cases::cases::PipelineDataUseCases;
use domain::entities::pipeline_data::{PipelineDataInputModel, PipelineDataOutputModel};
use domain::error::IoTBeeError;
use logging::AppLogger;

use crate::api::error::ApiError;
use crate::api::error::ErrorResponse;

type UseCase = dyn PipelineDataUseCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::pipeline_data::routers");

pub fn pipeline_data_scope(use_case: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/pipelines")
        .app_data(use_case)
        .service(create_pipeline_data)
        .service(get_pipeline_data)
        .service(get_pipeline_data_by_id)
}

#[utoipa::path(
    post,
    path = "/pipelines",
    request_body = CreatePipelineDataRequest,
    responses(
        (status = 201, description = "Pipeline created successfully"),
        (status = 400, description = "Invalid data", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[post("")]
pub async fn create_pipeline_data(
    use_case: web::Data<UseCase>,
    body: web::Json<CreatePipelineDataRequest>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("create_pipeline_data handler called");

    let pipeline_input: CreatePipelineDataRequest = body.into_inner();
    let pipeline_input: PipelineDataInputModel = pipeline_input.try_into()?;
    use_case
        .create_pipeline(&pipeline_input)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to create pipeline: {e}"));
            e
        })?;
    LOGGER.info("Pipeline created successfully");
    Ok(HttpResponse::Created().finish())
}

#[utoipa::path(
    get,
    path = "/pipelines",
    responses(
        (status = 200, description = "Pipelines retrieved successfully", body = [PipelineDataResponse]),
        (status = 404, description = "No pipelines found", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[get("")]
pub async fn get_pipeline_data(use_case: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("get_pipeline_data handler called");

    let pipelines: Vec<PipelineDataOutputModel> = use_case.get_pipeline().await.map_err(|e| {
        LOGGER.error(&format!("Failed to get pipelines: {e}"));
        e
    })?;
    let response: Vec<PipelineDataResponse> = pipelines
        .into_iter()
        .map(|p| p.try_into())
        .collect::<Result<_, IoTBeeError>>()?;
    LOGGER.info(&format!("Returning {} pipelines", response.len()));
    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    get,
    path = "/pipelines/{id}",
    params(
        ("id" = u32, Path, description = "Pipeline ID")
    ),
    responses(
        (status = 200, description = "Pipeline retrieved successfully", body = PipelineDataResponse),
        (status = 404, description = "Pipeline not found", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[get("/{id}")]
pub async fn get_pipeline_data_by_id(
    use_case: web::Data<UseCase>,
    id: web::Path<PipelineDataId>,
) -> Result<HttpResponse, ApiError> {
    let pipeline_id: PipelineDataId = id.into_inner();
    LOGGER.debug(&format!(
        "get_pipeline_data_by_id handler called for id={pipeline_id}"
    ));

    let pipeline: PipelineDataOutputModel = use_case
        .get_pipeline_by_id(&pipeline_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to get pipeline id={pipeline_id}: {e}"));
            e
        })?;
    let response: PipelineDataResponse = pipeline.try_into()?;
    LOGGER.info(&format!("Pipeline id={pipeline_id} retrieved successfully"));
    Ok(HttpResponse::Ok().json(response))
}

//crear endpoint para habilitar o deshabilitar el pipeline.
// #[put()]
