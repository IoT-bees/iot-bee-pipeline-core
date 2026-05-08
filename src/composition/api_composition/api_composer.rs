

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

static LOGGER: AppLogger = AppLogger::new("iot_bee::composition::api_composition::api_composer");
use actix_web::{App, HttpServer};

pub struct ApiComposer;

impl ApiComposer {
    pub async fn run(db: Arc<InternalDataBase>) -> std::io::Result<()> {
        let app_state = AppState::new(db);

        let connection_types = app_state.connection_types_app_state();
        let validation_schemas = app_state.validation_schemas_app_state();
        let data_sources = app_state.data_sources_app_state();
        let pipeline_groups = app_state.pipeline_groups_app_state();
        let data_stores = app_state.data_stores_app_state();
        let pipeline_data = app_state.pipeline_data_app_state();
        let pipeline_lifecycle = app_state.pipeline_lifecycle_app_state();

        LOGGER.info("IoT Bee starting on http://127.0.0.1:8080");
        LOGGER.info("Swagger UI at http://127.0.0.1:8080/swagger-ui/");

        HttpServer::new(move || {
            App::new()
                .service(
                    SwaggerUi::new("/swagger-ui/{_:.*}")
                        .url("/api-docs/openapi.json", ApiDoc::openapi()),
                )
                .service(connection_types_scope(connection_types.clone()))
                .service(validation_schemas_scope(validation_schemas.clone()))
                .service(data_sources_scope(data_sources.clone()))
                .service(pipeline_groups_scope(pipeline_groups.clone()))
                .service(data_store_scope(data_stores.clone()))
                .service(pipeline_data_scope(pipeline_data.clone()))
                .service(pipeline_lifecycle_scope(pipeline_lifecycle.clone()))
        })
        .bind("127.0.0.1:8080")?
        .run()
        .await
    }
}
