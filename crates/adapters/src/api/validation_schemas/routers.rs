use crate::api::validation_schemas::models::{
    CreateValidationSchemaRequest, UpdateValidationSchemaRequestJson,
    UpdateValidationSchemaRequestName,
};
use crate::api::error::ErrorResponse;
use crate::api::validation_schemas::models::{
    SchemaId, ValidationSchemaByIdResponse, ValidationSchemaResponse,
};
use application::validation_schemas_cases::cases::SchemaValidationUseCases;
use domain::error::{PipelinePersistenceError};
use logging::AppLogger;
use actix_web::{HttpResponse, delete, get, post, put, web};
use validator::Validate;
use crate::api::error::ApiError;

type UseCase = dyn SchemaValidationUseCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::validation_schemas::routers");

pub fn validation_schemas_scope(use_case: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/validation-schemas")
        .app_data(use_case)
        .service(create_validation_schema)
        .service(list_validation_schemas)
        .service(get_validation_schema)
        .service(update_validation_schema)
        .service(update_validation_schema_json)
        .service(delete_validation_schema)
}

#[utoipa::path(
    post,
    path = "/validation-schemas",
    request_body = CreateValidationSchemaRequest,
    responses(
        (status = 201, description = "Schema created successfully"),
        (status = 400, description = "Invalid data", body = ErrorResponse),
        (status = 409, description = "Schema name already exists", body = ErrorResponse)
    ),
    tag = "Validation Schemas"
)]
#[post("")]
pub async fn create_validation_schema(
    use_case: web::Data<UseCase>,
    body: web::Json<CreateValidationSchemaRequest>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("create_validation_schema handler called");

    let schema_data: CreateValidationSchemaRequest = body.into_inner();
    schema_data.validate_values().map_err(|e| {
        LOGGER.error(&format!("Validation error creating schema: {e}"));
        e
    })?;
    use_case
        .create_validation_schema(&schema_data.name, &schema_data.json_schema_str()?)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to create validation schema: {e}"));
            e
        })?;

    LOGGER.info("Validation schema created successfully");
    Ok(HttpResponse::Created().finish())
}

#[utoipa::path(
    get,
    path = "/validation-schemas/{id}",
    params(
        ("id" = u32, Path, description = "Schema ID")
    ),
    responses(
        (status = 200, description = "Schema found", body = ValidationSchemaByIdResponse),
        (status = 404, description = "Schema not found")
    ),
    tag = "Validation Schemas"
)]
#[get("/{id}")]
pub async fn get_validation_schema(
    use_case: web::Data<UseCase>,
    id_path: web::Path<SchemaId>,
) -> Result<HttpResponse, ApiError> {
    let id = id_path.into_inner();
    LOGGER.debug(&format!("get_validation_schema handler called for id={id}"));

    let result = use_case
        .get_validation_schema_by_id(id)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to get validation schema id={id}: {e}"));
            e
        })?;
    let response: ValidationSchemaByIdResponse = result.into();
    LOGGER.info(&format!("Validation schema id={id} retrieved successfully"));
    Ok(HttpResponse::Ok().json(response))
}

#[utoipa::path(
    get,
    path = "/validation-schemas",
    responses(
        (status = 200, description = "List of all schemas", body = Vec<ValidationSchemaResponse>)
    ),
    tag = "Validation Schemas"
)]
#[get("")]
pub async fn list_validation_schemas(
    _use_case: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("list_validation_schemas handler called");

    let result: Vec<ValidationSchemaResponse> = _use_case
        .get_validation_schema()
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to list validation schemas: {e}"));
            e
        })?
        .into_iter()
        .map(ValidationSchemaResponse::from)
        .collect();

    LOGGER.info(&format!("Returning {} validation schemas", result.len()));
    Ok(HttpResponse::Ok().json(result))
}

#[utoipa::path(
    put,
    path = "/validation-schemas/{id}/name",
    params(
        ("id" = i32, Path, description = "Schema ID")
    ),
    request_body = UpdateValidationSchemaRequestName,
    responses(
        (status = 200, description = "Schema name updated"),
        (status = 400, description = "Invalid data", body = ErrorResponse),
        (status = 404, description = "Schema not found", body = ErrorResponse)
    ),
    tag = "Validation Schemas"
)]
#[put("/{id}/name")]
pub async fn update_validation_schema(
    use_case: web::Data<UseCase>,
    id_path: web::Path<i32>,
    body: web::Json<UpdateValidationSchemaRequestName>,
) -> Result<HttpResponse, ApiError> {
    let id = id_path.into_inner();
    LOGGER.debug(&format!(
        "update_validation_schema (name) handler called for id={id}"
    ));

    let schema_data: UpdateValidationSchemaRequestName = body.into_inner();
    schema_data.validate().map_err(|e| {
        let err = PipelinePersistenceError::InvalidData {
            reason: e.to_string(),
        };
        LOGGER.error(&format!(
            "Validation error updating schema name id={id}: {e}"
        ));
        err
    })?;

    use_case
        .update_validation_schema_name(id as u32, &schema_data.name)
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to update schema name id={id}: {e}"));
            e
        })?;

    LOGGER.info(&format!(
        "Validation schema id={id} name updated successfully"
    ));
    Ok(HttpResponse::Ok().finish())
}

#[utoipa::path(
    put,
    path = "/validation-schemas/{id}/schema",
    params(
        ("id" = i32, Path, description = "Schema ID")
    ),
    request_body = UpdateValidationSchemaRequestJson,
    responses(
        (status = 200, description = "Schema JSON updated"),
        (status = 400, description = "Invalid data", body = ErrorResponse),
        (status = 404, description = "Schema not found", body = ErrorResponse)
    ),
    tag = "Validation Schemas"
)]
#[put("/{id}/schema")]
pub async fn update_validation_schema_json(
    use_case: web::Data<UseCase>,
    id_path: web::Path<u32>,
    body: web::Json<UpdateValidationSchemaRequestJson>,
) -> Result<HttpResponse, ApiError> {
    let id = id_path.into_inner();
    LOGGER.debug(&format!(
        "update_validation_schema_json handler called for id={id}"
    ));

    let schema_data: UpdateValidationSchemaRequestJson = body.into_inner();
    schema_data.validate_values().map_err(|e| {
        LOGGER.error(&format!(
            "Validation error updating schema json id={id}: {e}"
        ));
        e
    })?;
    use_case
        .update_validation_schema(id as u32, &schema_data.json_schema())
        .await
        .map_err(|e| {
            LOGGER.error(&format!("Failed to update schema json id={id}: {e}"));
            e
        })?;
    LOGGER.info(&format!(
        "Validation schema id={id} JSON updated successfully"
    ));
    Ok(HttpResponse::Ok().finish())
}

#[utoipa::path(
    delete,
    path = "/validation-schemas/{id}",
    params(
        ("id" = u32, Path, description = "Schema ID")
    ),
    responses(
        (status = 204, description = "Schema deleted"),
        (status = 404, description = "Schema not found", body = ErrorResponse)
    ),
    tag = "Validation Schemas"
)]
#[delete("/{id}")]
pub async fn delete_validation_schema(
    _use_case: web::Data<UseCase>,
    _path: web::Path<SchemaId>,
) -> Result<HttpResponse, ApiError> {
    let id = _path.into_inner();
    LOGGER.debug(&format!(
        "delete_validation_schema handler called for id={id}"
    ));
    LOGGER.warn(&format!(
        "delete_validation_schema id={id}: not yet implemented"
    ));
    // TODO: llamar use_case.delete_pipeline_validation_schema()
    Ok(HttpResponse::NoContent().finish())
}
