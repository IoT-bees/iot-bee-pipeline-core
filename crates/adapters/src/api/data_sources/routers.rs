use super::models::{
    CreateDataSourceRequest, DataSourceId, DataSourceResponse, UpdateDataSourceNameRequest,
    UpdateDataSourceRequest,
};
use crate::api::error::ApiError;
use crate::api::error::ErrorResponse;

use actix_web::{HttpResponse, get, post, put, web};
use application::data_sources_cases::cases::DataSourcesUseCases;
use domain::entities::data_source::{PipelineDataSourceInputModel, PipelineDataSourceUpdateModel};
use domain::error::PipelinePersistenceError;
use logging::AppLogger;
use validator::Validate;

type UseCase = dyn DataSourcesUseCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::data_sources::routers");

pub fn data_sources_scope(use_case: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/data-sources")
        .app_data(use_case)
        .service(create_data_source)
        .service(get_data_source)
        .service(list_data_sources)
        .service(update_data_source_name)
        .service(update_data_source)
}

#[utoipa::path(
    post,
    path = "/data-sources",
    request_body = CreateDataSourceRequest,
    responses(
        (status = 201, description = "Data source created successfully"),
        (status = 400, description = "Invalid data", body = ErrorResponse),
        (status = 409, description = "Data source name already exists", body = ErrorResponse)
    ),
    tag = "Data Sources"
)]
#[post("")]
pub async fn create_data_source(
    use_case: web::Data<UseCase>,
    body: web::Json<CreateDataSourceRequest>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("create_data_source handler called");

    let data_source_data: CreateDataSourceRequest = body.into_inner();
    data_source_data.validate().map_err(|e| {
        let err = PipelinePersistenceError::InvalidData {
            reason: e.to_string(),
        };
        LOGGER.error(&format!("Validation error creating data source: {e}"));
        err
    })?;

    let input_model = PipelineDataSourceInputModel::try_from(data_source_data)?;
    use_case
        .create_data_source(&input_model)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to create data source: {e}"));
            e
        })?;

    LOGGER.info("Data source created successfully");
    Ok(HttpResponse::Created().finish())
}

#[utoipa::path(
    get,
    path = "/data-sources/{id}",
    params(
        ("id" = u32, Path, description = "Data source ID")
    ),
    responses(
        (status = 200, description = "Data source retrieved successfully", body = DataSourceResponse),
        (status = 404, description = "Data source not found", body = ErrorResponse)
    ),
    tag = "Data Sources"
)]
#[get("/{id}")]
pub async fn get_data_source(
    use_case: web::Data<UseCase>,
    id: web::Path<DataSourceId>,
) -> Result<HttpResponse, ApiError> {
    let raw_id = *id;
    LOGGER.debug(&format!("get_data_source handler called for id={raw_id}"));

    let data_source = use_case.get_data_source(&id).await.map_err(|e| {
        LOGGER.error(&format!("Failed to get data source id={raw_id}: {e}"));
        e
    })?;
    let response = DataSourceResponse::try_from(data_source)?;
    LOGGER.info(&format!("Data source id={raw_id} retrieved successfully"));
    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    get,
    path = "/data-sources",
    responses(
        (status = 200, description = "Data sources retrieved successfully", body = [DataSourceResponse]),
        (status = 404, description = "Data sources not found", body = ErrorResponse)
    ),
    tag = "Data Sources"
)]
#[get("")]
pub async fn list_data_sources(use_case: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("list_data_sources handler called");

    let data_sources = use_case.list_data_sources().await.map_err(|e| {
        LOGGER.error(&format!("Failed to list data sources: {e}"));
        e
    })?;
    let response: Vec<DataSourceResponse> = data_sources
        .into_iter()
        .map(|ds| DataSourceResponse::try_from(ds))
        .collect::<Result<_, _>>()?;
    LOGGER.info(&format!("Returning {} data sources", response.len()));
    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    put,
    path = "/data-sources/{id}/name",
    params(
        ("id" = u32, Path, description = "Data source ID")
    ),
    request_body = UpdateDataSourceNameRequest,
    responses(
        (status = 200, description = "Data source name updated"),
        (status = 400, description = "Invalid data", body = ErrorResponse),
        (status = 404, description = "Data source not found", body = ErrorResponse)
    ),
    tag = "Data Sources"
)]
#[put("/{id}/name")]
pub async fn update_data_source_name(
    use_case: web::Data<UseCase>,
    id: web::Path<DataSourceId>,
    body: web::Json<UpdateDataSourceNameRequest>,
) -> Result<HttpResponse, ApiError> {
    let raw_id = *id;
    LOGGER.debug(&format!(
        "update_data_source_name handler called for id={raw_id}"
    ));

    let new_name = body.into_inner();
    new_name.validate().map_err(|e| {
        let err = PipelinePersistenceError::InvalidData {
            reason: e.to_string(),
        };
        LOGGER.error(&format!(
            "Validation error updating name for id={raw_id}: {e}"
        ));
        err
    })?;
    use_case
        .update_data_source_name(&id, &new_name.name)
        .await
        .map_err(|e| {
            LOGGER.error(&format!(
                "Failed to update name for data source id={raw_id}: {e}"
            ));
            e
        })?;
    LOGGER.info(&format!(
        "Data source id={raw_id} name updated successfully"
    ));
    Ok(HttpResponse::Ok().finish())
}

#[utoipa::path(
    put,
    path = "/data-sources/{id}",
    params(
        ("id" = u32, Path, description = "Data source ID")
    ),
    request_body = UpdateDataSourceRequest,
    responses(
        (status = 200, description = "Data source updated"),
        (status = 400, description = "Invalid data", body = ErrorResponse),
        (status = 404, description = "Data source not found", body = ErrorResponse)
    ),
    tag = "Data Sources"
)]
#[put("/{id}")]
pub async fn update_data_source(
    use_case: web::Data<UseCase>,
    id: web::Path<DataSourceId>,
    body: web::Json<UpdateDataSourceRequest>,
) -> Result<HttpResponse, ApiError> {
    let raw_id = *id;
    LOGGER.debug(&format!(
        "update_data_source handler called for id={raw_id}"
    ));

    let update_data: UpdateDataSourceRequest = body.into_inner();
    update_data.validate().map_err(|e| {
        let err = PipelinePersistenceError::InvalidData {
            reason: e.to_string(),
        };
        LOGGER.error(&format!(
            "Validation error updating data source id={raw_id}: {e}"
        ));
        err
    })?;
    let update_model = PipelineDataSourceUpdateModel::try_from(update_data)?;
    use_case
        .update_data_source(&id, &update_model)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to update data source id={raw_id}: {e}"));
            e
        })?;
    LOGGER.info(&format!("Data source id={raw_id} updated successfully"));
    Ok(HttpResponse::Ok().finish())
}
