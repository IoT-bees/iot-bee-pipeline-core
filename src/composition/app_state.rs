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

// // para los casos de uso de pipeline lifecycle
use application::pipeline_lifecycle_cases::cases::PipelineLifecycleCases;
use application::pipeline_lifecycle_cases::cases::PipelineLifecycleCasesImpl;
use infrastructure::pipeline_component_factory::infra_pipeline_component_factory::InfrastructurePipelineComponentFactory;

use adapters::actor_system::supervisor_actor_system::actor_wrapper::PipelineActorSupervisorSystemBridge;

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

    pub fn pipeline_lifecycle_app_state(
        &self,
    ) -> web::Data<dyn PipelineLifecycleCases + Send + Sync> {
        let pipeline_lifecycle = Box::new(PipelineActorSupervisorSystemBridge::instance());
        let pipeline_controller =
            Box::new(PipelineDataRepository::new(self.internal_data_base.clone()));
        let data_source_repository =
            Box::new(DataSourceRepository::new(self.internal_data_base.clone()));
        let validation_schema_repository = Box::new(ValidationSchemaRepository::new(
            self.internal_data_base.clone(),
        ));
        let data_store_repository =
            Box::new(DataStoreRepository::new(self.internal_data_base.clone()));
        let component_factory = Box::new(InfrastructurePipelineComponentFactory::new());

        let use_case = PipelineLifecycleCasesImpl::new(
            pipeline_lifecycle,
            pipeline_controller,
            data_source_repository,
            validation_schema_repository,
            data_store_repository,
            component_factory,
        );
        let use_case: Arc<dyn PipelineLifecycleCases + Send + Sync> = Arc::new(use_case);
        web::Data::from(use_case)
    }

    pub async fn start_all_pipelines(&self) {
        let pipeline_lifecycle = Box::new(PipelineActorSupervisorSystemBridge::instance());
        let pipeline_controller =
            Box::new(PipelineDataRepository::new(self.internal_data_base.clone()));
        let data_source_repository =
            Box::new(DataSourceRepository::new(self.internal_data_base.clone()));
        let validation_schema_repository = Box::new(ValidationSchemaRepository::new(
            self.internal_data_base.clone(),
        ));
        let data_store_repository =
            Box::new(DataStoreRepository::new(self.internal_data_base.clone()));
        let component_factory = Box::new(InfrastructurePipelineComponentFactory::new());

        let use_case = PipelineLifecycleCasesImpl::new(
            pipeline_lifecycle,
            pipeline_controller,
            data_source_repository,
            validation_schema_repository,
            data_store_repository,
            component_factory,
        );

        if let Err(e) = use_case.start_all_pipelines_in_system().await {
            tracing::error!("Fatal error during pipeline startup: {}", e);
        }
    }
}
