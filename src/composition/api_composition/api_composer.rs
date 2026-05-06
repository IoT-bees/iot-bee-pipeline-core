// use infrastructure::persistence::repositories::pipeline_repository::PipelineStoreRepository;
// use application::validation_schemas_cases::cases::{
//     SchemaValidationUseCases, SchemaValidationUseCasesImpl,
// };

// //para los casos de uso de connection types
use application::connection_types_cases::cases::ConnectionTypesUseCases;
use application::connection_types_cases::cases::ConnectionTypesUseCasesImpl;
use infrastructure::persistence::repositories::connection_types_repository::ConnectionTypesRepository;

// para los casos de uso de validation schemas
use application::validation_schemas_cases::cases::{
    SchemaValidationUseCases, SchemaValidationUseCasesImpl,
};
use infrastructure::persistence::repositories::validation_schemas_repository::ValidationSchemaRepository;

//para los caso de uso de  data sources
use application::data_sources_cases::cases::DataSourcesUseCases;
use application::data_sources_cases::cases::DataSourcesUseCasesImpl;
use infrastructure::persistence::repositories::data_source_repository::DataSourceRepository;

//para los casos de uso de pipeline groups
use application::groups_cases::cases::PipelineGroupUseCases;
use application::groups_cases::cases::PipelineGroupUseCasesImpl;
use infrastructure::persistence::repositories::groups_repository::GroupRepository;
// // para los casos de uso de data stores
use application::data_store_cases::cases::DataStoreUseCases;
use application::data_store_cases::cases::DataStoreUseCasesImpl;
use infrastructure::persistence::repositories::data_store_repository::DataStoreRepository;

// //para los casos de pipeline data
use application::pipeline_data_cases::cases::PipelineDataUseCases;
use application::pipeline_data_cases::cases::PipelineDataUseCasesImpl;
use infrastructure::persistence::repositories::pipeline_data_repository::PipelineDataRepository;

use actix_web::web;

use infrastructure::persistence::connection::InternalDataBase;
use std::sync::Arc;

use crate::config::Config;

pub struct AppState {
    internal_data_base: Arc<InternalDataBase>,
}

impl AppState {
    pub fn new(internal_data_base: Arc<InternalDataBase>) -> Self {
        Self { internal_data_base }
    }

    pub async fn build_db() -> Result<Arc<InternalDataBase>, Box<dyn std::error::Error>> {
        let config = Config::get();
        Ok(Arc::new(InternalDataBase::new(&config.database_url).await?))
    }

    pub fn connection_types_app_state(
        &self,
    ) -> web::Data<dyn ConnectionTypesUseCases + Send + Sync> {
        let type_connection_repo: Arc<ConnectionTypesRepository> = Arc::new(
            ConnectionTypesRepository::new(self.internal_data_base.clone()),
        );
        let connection_types_use_case: Arc<dyn ConnectionTypesUseCases + Send + Sync> =
            Arc::new(ConnectionTypesUseCasesImpl::new(type_connection_repo));
        web::Data::from(connection_types_use_case)
    }
    pub fn validation_schemas_app_state(
        &self,
    ) -> web::Data<dyn SchemaValidationUseCases + Send + Sync> {
        let validation_schema_repo: Arc<ValidationSchemaRepository> = Arc::new(
            ValidationSchemaRepository::new(self.internal_data_base.clone()),
        );
        let validation_schema_use_case: Arc<dyn SchemaValidationUseCases + Send + Sync> =
            Arc::new(SchemaValidationUseCasesImpl::new(validation_schema_repo));
        web::Data::from(validation_schema_use_case)
    }
    pub fn data_sources_app_state(&self) -> web::Data<dyn DataSourcesUseCases + Send + Sync> {
        let data_sources_repo: Arc<DataSourceRepository> =
            Arc::new(DataSourceRepository::new(self.internal_data_base.clone()));
        let data_sources_use_case: Arc<dyn DataSourcesUseCases + Send + Sync> =
            Arc::new(DataSourcesUseCasesImpl::new(data_sources_repo));
        web::Data::from(data_sources_use_case)
    }
    pub fn pipeline_groups_app_state(&self) -> web::Data<dyn PipelineGroupUseCases + Send + Sync> {
        let pipeline_groups_repo: Arc<GroupRepository> =
            Arc::new(GroupRepository::new(self.internal_data_base.clone()));
        let pipeline_groups_use_case: Arc<dyn PipelineGroupUseCases + Send + Sync> =
            Arc::new(PipelineGroupUseCasesImpl::new(pipeline_groups_repo));
        web::Data::from(pipeline_groups_use_case)
    }

    pub fn data_stores_app_state(&self) -> web::Data<dyn DataStoreUseCases + Send + Sync> {
        let data_stores_repo: Arc<DataStoreRepository> =
            Arc::new(DataStoreRepository::new(self.internal_data_base.clone()));
        let data_stores_use_case: Arc<dyn DataStoreUseCases + Send + Sync> =
            Arc::new(DataStoreUseCasesImpl::new(data_stores_repo));
        web::Data::from(data_stores_use_case)
    }

    pub fn pipeline_data_app_state(&self) -> web::Data<dyn PipelineDataUseCases + Send + Sync> {
        let pipeline_data_repo: Arc<PipelineDataRepository> =
            Arc::new(PipelineDataRepository::new(self.internal_data_base.clone()));
        let pipeline_data_use_case: Arc<dyn PipelineDataUseCases + Send + Sync> =
            Arc::new(PipelineDataUseCasesImpl::new(pipeline_data_repo));
        web::Data::from(pipeline_data_use_case)
    }
}

use adapters::api::api_docs::ApiDoc;
use logging::{AppLogger};
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

static LOGGER: AppLogger = AppLogger::new("iot_bee::composition::api_composition::api_composer");
use actix_web::{App, HttpServer};


pub struct ApiComposer;

impl ApiComposer {
    pub async fn run(db: Arc<InternalDataBase>) -> std::io::Result<()> {
        let app_state = AppState::new(db);

        let connection_types   = app_state.connection_types_app_state();
        let validation_schemas = app_state.validation_schemas_app_state();
        let data_sources       = app_state.data_sources_app_state();
        let pipeline_groups    = app_state.pipeline_groups_app_state();
        let data_stores        = app_state.data_stores_app_state();
        let pipeline_data      = app_state.pipeline_data_app_state();

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
        })
        .bind("127.0.0.1:8080")?
        .run()
        .await
    }
}
