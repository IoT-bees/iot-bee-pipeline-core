use crate::api::connection_types::models::ConnectionTypeResponse;
use crate::api::data_sources::config::DataSourceConfig;
use actix_web::{HttpResponse, get, web};
use logging::AppLogger;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::connection_types::routers");

pub fn connection_types_scope() -> actix_web::Scope {
    web::scope("/connection-types").service(get_connection_types)
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
pub async fn get_connection_types() -> HttpResponse {
    LOGGER.debug("get_connection_types handler called");

    let connection_types = DataSourceConfig::available_source_types()
        .into_iter()
        .map(ConnectionTypeResponse::from)
        .collect::<Vec<_>>();

    LOGGER.info(&format!(
        "Returning {} connection types",
        connection_types.len()
    ));
    HttpResponse::Ok().json(connection_types)
}
