use crate::api::pipeline_groups::models::{CreateGroupRequest, GroupResponse};
use application::groups_cases::cases::PipelineGroupUseCases;
use domain::error::{IoTBeeError, PipelinePersistenceError};
use logging::AppLogger;

use crate::api::error::ApiError;
use crate::api::error::ErrorResponse;
use actix_web::{HttpResponse, get, post, web};
use validator::Validate;

type UseCase = dyn PipelineGroupUseCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::crate::api::pipeline_groups::routers");

pub fn pipeline_groups_scope(use_case: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/pipeline-groups")
        .app_data(use_case)
        .service(create_pipeline_group)
        .service(get_pipeline_groups)
        .service(get_pipeline_group_by_id)
        // .service()
}

#[utoipa::path(
    post,
    path = "/pipeline-groups",
    request_body = CreateGroupRequest,
    responses(
        (status = 201, description = "Pipeline group created successfully"),
        (status = 400, description = "Invalid data", body = ErrorResponse),
        (status = 409, description = "Pipeline group name already exists", body = ErrorResponse)
    ),
    tag = "Pipeline Groups"
)]
#[post("")]
pub async fn create_pipeline_group(
    use_case: web::Data<UseCase>,
    body: web::Json<CreateGroupRequest>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("create_pipeline_group handler called");

    let group_data: CreateGroupRequest = body.into_inner();
    group_data.validate().map_err(|e| {
        let err = PipelinePersistenceError::InvalidData {
            reason: e.to_string(),
        };
        LOGGER.error(&format!("Validation error creating pipeline group: {e}"));
        err
    })?;
    use_case
        .create_pipeline_group(&group_data.name, &group_data.description)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to create pipeline group: {e}"));
            e
        })?;
    LOGGER.info("Pipeline group created successfully");
    Ok(HttpResponse::Created().finish())
}

#[utoipa::path(
    get,
    path = "/pipeline-groups",
    responses(
        (status = 200, description = "List of pipeline groups retrieved successfully", body = [GroupResponse])
    ),
    tag = "Pipeline Groups"
)]
#[get("")]
pub async fn get_pipeline_groups(use_case: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("get_pipeline_groups handler called");

    let groups = use_case.get_pipeline_groups().await.map_err(|e| {
        LOGGER.error(&format!("Failed to get pipeline groups: {e}"));
        e
    })?;
    let response: Vec<GroupResponse> = groups
        .into_iter()
        .map(GroupResponse::try_from)
        .collect::<Result<_, IoTBeeError>>()?;
    LOGGER.info(&format!("Returning {} pipeline groups", response.len()));
    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    get,
    path = "/pipeline-groups/{id}",
    params(
        ("id" = u32, Path, description = "Pipeline group ID")
    ),
    responses(
        (status = 200, description = "Pipeline group retrieved successfully", body = GroupResponse),
        (status = 404, description = "Pipeline group not found", body = ErrorResponse)
    ),
    tag = "Pipeline Groups"
)]
#[get("/{id}")]
pub async fn get_pipeline_group_by_id(
    use_case: web::Data<UseCase>,
    id: web::Path<u32>,
) -> Result<HttpResponse, ApiError> {
    let group_id = id.into_inner();
    LOGGER.debug(&format!(
        "get_pipeline_group_by_id handler called for id={group_id}"
    ));

    let group = use_case
        .get_pipeline_group_by_id(&group_id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to get pipeline group id={group_id}: {e}"));
            e
        })?;
    let response = GroupResponse::try_from(group)?;
    LOGGER.info(&format!(
        "Pipeline group id={group_id} retrieved successfully"
    ));
    Ok(HttpResponse::Ok().json(response))
}
