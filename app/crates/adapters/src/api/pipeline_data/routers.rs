use crate::api::pipeline_data::models::{
    CreatePipelineDataRequest, PipelineDataId, PipelineDataResponse,
};
use actix_web::{HttpRequest, HttpResponse, delete, get, post, put, web};
use application::pipeline_data_cases::cases::PipelineDataUseCases;
use domain::entities::pipeline_data::{PipelineDataInputModel, PipelineDataOutputModel};
use domain::error::IoTBeeError;
use logging::AppLogger;

use crate::api::error::ApiError;
use crate::api::error::ErrorResponse;
use crate::api::utils::require_org_id;

type UseCase = dyn PipelineDataUseCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::pipeline_data::routers");

pub fn pipeline_data_scope(use_case: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/pipelines")
        .app_data(use_case)
        .service(create_pipeline_data)
        .service(get_pipeline_data)
        .service(get_pipeline_data_by_id)
        .service(delete_pipeline_data_by_id)
        .service(get_pipeline_data_by_group_id)
        .service(update_pipeline_data_source)
        .service(update_pipeline_data_store)
        .service(update_pipeline_validation_schema)
        .service(update_pipeline_group)
        .service(update_pipeline_replication_factor)
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
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    body: web::Json<CreatePipelineDataRequest>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("create_pipeline_data handler called");
    let org_id = require_org_id(&req)?;

    let pipeline_input: CreatePipelineDataRequest = body.into_inner();
    let pipeline_input: PipelineDataInputModel = pipeline_input.try_into()?;
    use_case
        .create_pipeline(org_id, &pipeline_input)
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
pub async fn get_pipeline_data(
    req: HttpRequest,
    use_case: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("get_pipeline_data handler called");
    let org_id = require_org_id(&req)?;

    let pipelines: Vec<PipelineDataOutputModel> =
        use_case.get_pipeline(org_id).await.map_err(|e| {
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
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    id: web::Path<PipelineDataId>,
) -> Result<HttpResponse, ApiError> {
    let org_id = require_org_id(&req)?;
    let pipeline_id: PipelineDataId = id.into_inner();
    LOGGER.debug(&format!(
        "get_pipeline_data_by_id handler called for id={pipeline_id}"
    ));

    let pipeline: PipelineDataOutputModel = use_case
        .get_pipeline_by_id(org_id, &pipeline_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to get pipeline id={pipeline_id}: {e}"));
            e
        })?;
    let response: PipelineDataResponse = pipeline.try_into()?;
    LOGGER.info(&format!("Pipeline id={pipeline_id} retrieved successfully"));
    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    delete,
    path = "/pipelines/{id}",
    params(
        ("id" = u32, Path, description = "Pipeline ID")
    ),
    responses(
        (status = 204, description = "Pipeline deleted successfully"),
        (status = 404, description = "Pipeline not found", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[delete("/{id}")]
pub async fn delete_pipeline_data_by_id(
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    id: web::Path<PipelineDataId>,
) -> Result<HttpResponse, ApiError> {
    let org_id = require_org_id(&req)?;
    let pipeline_id: PipelineDataId = id.into_inner();
    LOGGER.debug(&format!(
        "delete_pipeline_data_by_id handler called for id={pipeline_id}"
    ));
    use_case
        .delete_pipeline_by_id(org_id, &pipeline_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to delete pipeline id={pipeline_id}: {e}"));
            e
        })?;
    LOGGER.info(&format!("Pipeline id={pipeline_id} deleted successfully"));
    Ok(HttpResponse::NoContent().finish())
}

#[utoipa::path(
    get,
    path = "/pipelines/group/{group_id}",
    params(
        ("group_id" = u32, Path, description = "Pipeline group ID")
    ),
    responses(
        (status = 200, description = "Pipelines retrieved successfully", body = [PipelineDataResponse]),
        (status = 404, description = "No pipelines found for the group", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[get("/group/{group_id}")]
pub async fn get_pipeline_data_by_group_id(
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    group_id: web::Path<u32>,
) -> Result<HttpResponse, ApiError> {
    let org_id = require_org_id(&req)?;
    let group_id = group_id.into_inner();
    LOGGER.debug(&format!(
        "get_pipeline_data_by_group_id handler called for group_id={group_id}"
    ));
    let pipelines: Vec<PipelineDataOutputModel> = use_case
        .get_pipeline_by_group_id(org_id, &group_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!(
                "Failed to get pipelines for group_id={group_id}: {e}"
            ));
            e
        })?;
    let response: Vec<PipelineDataResponse> = pipelines
        .into_iter()
        .map(|p| p.try_into())
        .collect::<Result<_, IoTBeeError>>()?;
    LOGGER.info(&format!(
        "Returning {} pipelines for group_id={group_id}",
        response.len()
    ));
    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    put,
    path = "/pipelines/data_source/{pipeline_id}/{data_source_id}",
    params(
        ("pipeline_id" = u32, Path, description = "ID del pipeline a actualizar"),
        ("data_source_id" = u32, Path, description = "ID de la fuente de datos que se asignará al pipeline")
    ),
    responses(
        (status = 200, description = "Fuente de datos del pipeline actualizada exitosamente"),
        (status = 400, description = "Datos inválidos", body = ErrorResponse),
        (status = 404, description = "Pipeline o fuente de datos no encontrado", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[put("/data_source/{pipeline_id}/{data_source_id}")]
pub async fn update_pipeline_data_source(
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    path: web::Path<(u32, u32)>,
) -> Result<HttpResponse, ApiError> {
    let org_id = require_org_id(&req)?;
    let (pipeline_id, data_source_id) = path.into_inner();
    LOGGER.debug(&format!("update_pipeline_data_source handler called for pipeline_id={pipeline_id}, data_source_id={data_source_id}"));
    use_case
        .update_data_source(org_id, &pipeline_id, &data_source_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!(
                "Failed to update data source for pipeline id={pipeline_id}: {e}"
            ));
            e
        })?;
    LOGGER.info(&format!(
        "Data source for pipeline id={pipeline_id} updated successfully"
    ));
    Ok(HttpResponse::Ok().finish())
}

#[utoipa::path(
    put,
    path = "/pipelines/store/{pipeline_id}/{data_store_id}",
    params(
        ("pipeline_id" = u32, Path, description = "ID del pipeline a actualizar"),
        ("data_store_id" = u32, Path, description = "ID del data store que se asignará al pipeline")
    ),
    responses(
        (status = 200, description = "Data store del pipeline actualizado exitosamente"),
        (status = 400, description = "Datos inválidos", body = ErrorResponse),
        (status = 404, description = "Pipeline o data store no encontrado", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[put("/store/{pipeline_id}/{data_store_id}")]
async fn update_pipeline_data_store(
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    path: web::Path<(u32, u32)>,
) -> Result<HttpResponse, ApiError> {
    let org_id = require_org_id(&req)?;
    let (pipeline_id, data_store_id) = path.into_inner();
    LOGGER.debug(&format!("update_pipeline_data_store handler called for pipeline_id={pipeline_id}, data_store_id={data_store_id}"));
    use_case
        .update_store_data_source(org_id, &pipeline_id, &data_store_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!(
                "Failed to update store for pipeline id={pipeline_id}: {e}"
            ));
            e
        })?;
    LOGGER.info(&format!(
        "Store for pipeline id={pipeline_id} updated successfully"
    ));
    Ok(HttpResponse::Ok().finish())
}

#[utoipa::path(
    put,
    path = "/pipelines/validation_schema/{pipeline_id}/{schema_id}",
    params(
        ("pipeline_id" = u32, Path, description = "ID del pipeline a actualizar"),
        ("schema_id" = u32, Path, description = "ID del esquema de validación que se asignará al pipeline")
    ),
    responses(
        (status = 200, description = "Esquema de validación del pipeline actualizado exitosamente"),
        (status = 400, description = "Datos inválidos", body = ErrorResponse),
        (status = 404, description = "Pipeline o esquema de validación no encontrado", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[put("/validation_schema/{pipeline_id}/{schema_id}")]
async fn update_pipeline_validation_schema(
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    path: web::Path<(u32, u32)>,
) -> Result<HttpResponse, ApiError> {
    let org_id = require_org_id(&req)?;
    let (pipeline_id, schema_id) = path.into_inner();
    LOGGER.debug(&format!("update_pipeline_validation_schema handler called for pipeline_id={pipeline_id}, schema_id={schema_id}"));
    use_case
        .update_validation_schema(org_id, &pipeline_id, &schema_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!(
                "Failed to update validation schema for pipeline id={pipeline_id}: {e}"
            ));
            e
        })?;
    LOGGER.info(&format!(
        "Validation schema for pipeline id={pipeline_id} updated successfully"
    ));
    Ok(HttpResponse::Ok().finish())
}

#[utoipa::path(
    put,
    path = "/pipelines/group/{pipeline_id}/{group_id}",
    params(
        ("pipeline_id" = u32, Path, description = "ID del pipeline a actualizar"),
        ("group_id" = u32, Path, description = "ID del grupo que se asignará al pipeline")
    ),
    responses(
        (status = 200, description = "Grupo del pipeline actualizado exitosamente"),
        (status = 400, description = "Datos inválidos", body = ErrorResponse),
        (status = 404, description = "Pipeline o grupo no encontrado", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[put("/group/{pipeline_id}/{group_id}")]
async fn update_pipeline_group(
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    path: web::Path<(u32, u32)>,
) -> Result<HttpResponse, ApiError> {
    let org_id = require_org_id(&req)?;
    let (pipeline_id, group_id) = path.into_inner();
    LOGGER.debug(&format!(
        "update_pipeline_group handler called for pipeline_id={pipeline_id}, group_id={group_id}"
    ));
    use_case
        .update_group(org_id, &pipeline_id, &group_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!(
                "Failed to update group for pipeline id={pipeline_id}: {e}"
            ));
            e
        })?;
    LOGGER.info(&format!(
        "Group for pipeline id={pipeline_id} updated successfully"
    ));
    Ok(HttpResponse::Ok().finish())
}

#[utoipa::path(
    put,
    path = "/pipelines/replication_factor/{pipeline_id}/{replication_factor}",
    params(
        ("pipeline_id" = u32, Path, description = "ID del pipeline a actualizar"),
        ("replication_factor" = u32, Path, description = "Nuevo factor de replicación para el pipeline")
    ),
    responses(
        (status = 200, description = "Factor de replicación del pipeline actualizado exitosamente"),
        (status = 400, description = "Datos inválidos", body = ErrorResponse),
        (status = 404, description = "Pipeline no encontrado", body = ErrorResponse)
    ),
    tag = "Pipelines"
)]
#[put("/replication_factor/{pipeline_id}/{replication_factor}")]
async fn update_pipeline_replication_factor(
    req: HttpRequest,
    use_case: web::Data<UseCase>,
    path: web::Path<(u32, u32)>,
) -> Result<HttpResponse, ApiError> {
    let org_id = require_org_id(&req)?;
    let (pipeline_id, replication_factor) = path.into_inner();
    LOGGER.debug(&format!(
        "update_pipeline_replication_factor handler called for pipeline_id={pipeline_id}, replication_factor={replication_factor}"
    ));
    use_case
        .update_replication_factor(org_id, &pipeline_id, &replication_factor)
        .await
        .map_err(|e| {
            LOGGER.error(&format!(
                "Failed to update replication factor for pipeline id={pipeline_id}: {e}"
            ));
            e
        })?;
    LOGGER.info(&format!(
        "Replication factor for pipeline id={pipeline_id} updated successfully"
    ));
    Ok(HttpResponse::Ok().finish())
}
