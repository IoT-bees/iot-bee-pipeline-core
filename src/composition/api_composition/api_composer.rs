use infrastructure::persistence::connection::InternalDataBase;
use std::sync::Arc;

use super::super::app_state::AppState;
use adapters::api::api_docs::ApiDoc;
use logging::AppLogger;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

//USE CASES
//connection types
use adapters::api::connection_types::routers::connection_types_scope;
//validation schemas
use adapters::api::validation_schemas::routers::validation_schemas_scope;
//data sources
use adapters::api::data_sources::routers::data_sources_scope;
// pipeline groups
use adapters::api::pipeline_groups::routers::pipeline_groups_scope;
//data stores
use adapters::api::data_store::routers::data_store_scope;
//pipeline data
use adapters::api::pipeline_data::routers::pipeline_data_scope;
//pipeline lifecycle
use adapters::api::pipeline_lifecycle::routers::pipeline_lifecycle_scope;
//license
use adapters::api::license::routers::{license_scope, stripe_license_sync_scope};
//auth
use actix_cors::Cors;
use actix_web::web;
use adapters::api::auth::middleware::JwtAuth;
use adapters::api::auth::routers::auth_scope;

static LOGGER: AppLogger = AppLogger::new("iot_bee::composition::api_composition::api_composer");
use actix_web::{App, HttpServer};

pub struct ApiComposer;

impl ApiComposer {
    pub async fn run(db: Arc<InternalDataBase>) -> std::io::Result<()> {
        let app_state = AppState::new(db);

        let validation_schemas = app_state.validation_schemas_app_state();
        let data_sources = app_state.data_sources_app_state();
        let pipeline_groups = app_state.pipeline_groups_app_state();
        let data_stores = app_state.data_stores_app_state();
        let pipeline_data = app_state.pipeline_data_app_state();
        let pipeline_lifecycle = app_state.pipeline_lifecycle_app_state();
        let license = app_state.license_app_state();
        let auth = app_state.auth_app_state();
        let cors_origins = app_state.config.cors_origins.clone();

        let port = app_state.config.api_port.unwrap_or(8080);
        let host = app_state
            .config
            .api_host
            .clone()
            .unwrap_or_else(|| "127.0.0.1".to_string());
        LOGGER.info(&format!("IoT Bee starting on http://{}:{}", host, port));
        LOGGER.info(&format!(
            "Swagger UI at http://{}:{}/swagger-ui/",
            host, port
        ));

        HttpServer::new(move || {
            let mut cors = Cors::default()
                .allow_any_method()
                .allow_any_header()
                .max_age(3600);
            for origin in cors_origins.iter() {
                cors = cors.allowed_origin(origin);
            }
            App::new()
                .wrap(cors)
                .service(
                    SwaggerUi::new("/swagger-ui/{_:.*}")
                        .url("/api-docs/openapi.json", ApiDoc::openapi()),
                )
                .service(auth_scope(auth.clone()))
                .service(stripe_license_sync_scope(
                    license.clone(),
                    pipeline_data.clone(),
                ))
                .service(
                    web::scope("")
                        .app_data(auth.clone())
                        .wrap(JwtAuth)
                        .service(connection_types_scope())
                        .service(validation_schemas_scope(validation_schemas.clone()))
                        .service(data_sources_scope(data_sources.clone()))
                        .service(pipeline_groups_scope(pipeline_groups.clone()))
                        .service(data_store_scope(data_stores.clone()))
                        .service(pipeline_data_scope(pipeline_data.clone()))
                        .service(pipeline_lifecycle_scope(pipeline_lifecycle.clone()))
                        .service(license_scope(license.clone(), pipeline_data.clone())),
                )
        })
        .bind(format!("{}:{}", host, port))?
        .run()
        .await
    }
}
