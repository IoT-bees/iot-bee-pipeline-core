use crate::api::data_store::models::{CreateDataStoreRequest, DataStoreId, DataStoreResponse};
use crate::api::error::ErrorResponse;

use crate::api::error::ApiError;
use application::data_store_cases::cases::DataStoreUseCases;
use domain::entities::data_store::{PipelineDataStoreInputModel, PipelineDataStoreOutputModel};
use logging::AppLogger;

use actix_web::{HttpResponse, delete, get, post, put, web};

type UseCase = dyn DataStoreUseCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::api::data_store::routers");

pub fn data_store_scope(use_case: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/data-stores")
        .app_data(use_case)
        .service(create_data_store)
        .service(get_data_store)
        .service(list_data_stores)
        .service(test_data_store)
        .service(update_configuration)
        .service(delete_data_store)
}

#[post("/{id}/test")]
pub async fn test_data_store(
    use_case: web::Data<UseCase>,
    id: web::Path<DataStoreId>,
) -> Result<HttpResponse, ApiError> {
    let data_id: u32 = id.into_inner();
    let message = use_case.test_data_store(&data_id).await?;
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "ok": true,
        "message": message
    })))
}

#[utoipa::path(
    post,
    path = "/data-stores",
    request_body = CreateDataStoreRequest,
    responses(
        (status = 201, description = "Data store created successfully"),
        (status = 400, description = "Invalid data", body = ErrorResponse)
    ),
    tag = "Data Stores"
)]
#[post("")]
pub async fn create_data_store(
    use_case: web::Data<UseCase>,
    body: web::Json<CreateDataStoreRequest>,
) -> Result<HttpResponse, ApiError> {
    let data_store_input = PipelineDataStoreInputModel::try_from(body.into_inner())?;
    use_case.create_data_store(&data_store_input).await?;
    Ok(HttpResponse::Created().finish())
}

#[utoipa::path(
    get,
    path = "/data-stores/{id}",
    params(
        ("id" = u32, Path, description = "Data store ID")
    ),
    responses(
        (status = 200, description = "Data store retrieved successfully", body = DataStoreResponse),
        (status = 404, description = "Data store not found", body = ErrorResponse)
    ),
    tag = "Data Stores"
)]
#[get("/{id}")]
pub async fn get_data_store(
    use_case: web::Data<UseCase>,
    id: web::Path<DataStoreId>,
) -> Result<HttpResponse, ApiError> {
    let data_id: u32 = id.into_inner();
    let data_store: PipelineDataStoreOutputModel = use_case.get_data_store_by_id(&data_id).await?;
    let response: DataStoreResponse = data_store.try_into()?;
    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    get,
    path = "/data-stores",
    responses(
        (status = 200, description = "Data stores retrieved successfully", body = [DataStoreResponse])
    ),
    tag = "Data Stores"
)]
#[get("")]
pub async fn list_data_stores(use_case: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("list data stores handler called");
    let data_stores: Vec<PipelineDataStoreOutputModel> = use_case.get_data_store().await?;
    let response: Vec<DataStoreResponse> = data_stores
        .into_iter()
        .map(|data_store| data_store.try_into())
        .collect::<Result<Vec<DataStoreResponse>, domain::error::IoTBeeError>>()?;

    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    put,
    path = "/data-stores/{id}",
    params(
        ("id" = u32, Path, description = "Data store ID")
    ),
    request_body = CreateDataStoreRequest,
    responses(
        (status = 200, description = "Data store configuration updated successfully"),
        (status = 400, description = "Invalid data", body = ErrorResponse),
        (status = 404, description = "Data store not found", body = ErrorResponse)
    ),
    tag = "Data Stores"
)]
#[put("/{id}")]
pub async fn update_configuration(
    use_case: web::Data<UseCase>,
    id: web::Path<DataStoreId>,
    body: web::Json<CreateDataStoreRequest>,
) -> Result<HttpResponse, ApiError> {
    let data_id: u32 = id.into_inner();
    let data_store_input = PipelineDataStoreInputModel::try_from(body.into_inner())?;
    use_case
        .update_data_store_configuration(&data_id, &data_store_input)
        .await?;
    Ok(HttpResponse::Ok().finish())
}

#[utoipa::path(
    delete,
    path = "/data-stores/{id}",
    params(
        ("id" = u32, Path, description = "Data store ID")
    ),
    responses(
        (status = 204, description = "Data store deleted successfully"),
        (status = 404, description = "Data store not found", body = ErrorResponse)
    ),
    tag = "Data Stores"
)]
#[delete("/{id}")]
pub async fn delete_data_store(
    use_case: web::Data<UseCase>,
    id: web::Path<DataStoreId>,
) -> Result<HttpResponse, ApiError> {
    let data_id: u32 = id.into_inner();
    use_case.delete_data_store(&data_id).await?;
    Ok(HttpResponse::NoContent().finish())
}
