use application::connection_types_cases::cases::ConnectionTypesUseCases;
use crate::api::error::{ApiError}; 
use actix_web::{HttpResponse, get, web};
use crate::api::connection_types::models::ConnectionTypeResponse;
use logging::AppLogger;

type UseCase = dyn ConnectionTypesUseCases + Send + Sync;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::connection_types::routers");

pub fn connection_types_scope(use_cases: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/connection-types")
        .app_data(use_cases)
        .service(get_connection_types)
}


#[utoipa::path(
    get,
    path = "/connection-types",
    responses(
        (status = 200, description = "List of connection types", body = [ConnectionTypeResponse])
    ),
    tag = "Connection Types"
)]
#[get("")]
pub async fn get_connection_types(
    use_cases: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    LOGGER.debug("get_connection_types handler called");

    let connection_types = use_cases.get_all_connection_types().await.map_err(|e| {
        LOGGER.error(&format!("Failed to get connection types: {e}"));
        e
    })?;

    let connection_types = connection_types
        .into_iter()
        .map(|data| data.into())
        .collect::<Vec<ConnectionTypeResponse>>();

    LOGGER.info(&format!(
        "Returning {} connection types",
        connection_types.len()
    ));
    Ok(HttpResponse::Ok().json(connection_types))
}


