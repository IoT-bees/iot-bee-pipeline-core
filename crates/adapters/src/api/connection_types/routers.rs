use crate::api::data_sources::config::DataSourceConfig;
use crate::api::data_store::config::DataStoreConfig;
use crate::api::{
    connection_types::models::ConnectionTypeResponse, connection_types::models::StoreTypesResponse,
};
use actix_web::{HttpResponse, get, web};
use logging::AppLogger;

static LOGGER: AppLogger = AppLogger::new("iot_bee::adapters::api::connection_types::routers");

pub fn connection_types_scope() -> actix_web::Scope {
    web::scope("/connection-types")
        .service(get_connection_types)
        .service(get_data_store_types)
}

#[utoipa::path(
    get,
    path = "/connection-types/data-sources",
    responses(
        (status = 200, description = "List of connection types", body = [ConnectionTypeResponse])
    ),
    tag = "Connection Types"
)]
#[get("/data-sources")]
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

#[utoipa::path(
    get,
    path = "/connection-types/data-stores",
    responses(
        (status = 200, description = "List of data store types", body = [StoreTypesResponse])
    ),
    tag = "Connection Types"
)]
#[get("/data-stores")]
pub async fn get_data_store_types() -> HttpResponse {
    LOGGER.debug("get_data_store_types handler called");
    let data_store_types = DataStoreConfig::available_types();
    HttpResponse::Ok().json(StoreTypesResponse::from(data_store_types))
}
