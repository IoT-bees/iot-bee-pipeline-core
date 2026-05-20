use adapters::actor_system::supervisor_actor_system::actor_wrapper::PipelineActorSupervisorSystemBridge;

use application::pipeline_lifecycle_cases::cases::{
    PipelineLifecycleCases, PipelineLifecycleCasesImpl,
};

use domain::plan::outbound::plan_repository::PlanRepository;
use infrastructure::persistence::connection::InternalDataBase;
use infrastructure::persistence::repositories::{
    data_source_repository::DataSourceRepository, data_store_repository::DataStoreRepository,
    license_repository::SqliteLicenseRepository, pipeline_data_repository::PipelineDataRepository,
    plans_repository::SqlitePlansRepository,
    validation_schemas_repository::ValidationSchemaRepository,
};
use infrastructure::pipeline_component_factory::infra_pipeline_component_factory::InfrastructurePipelineComponentFactory;

use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger =
    AppLogger::new("iot_bee::composition::pipeline_composition::pipeline_composer");

pub struct PipelineSystemComposer;

impl PipelineSystemComposer {
    pub async fn run(db: Arc<InternalDataBase>) {
        // Inicializa el singleton del actor supervisor.
        // Aunque se llame varias veces a instance() en cualquier parte del programa,
        // el actor subyacente solo se crea aquí, la primera vez.
        let pipeline_lifecycle = Box::new(PipelineActorSupervisorSystemBridge::instance());

        let pipeline_controller = Box::new(PipelineDataRepository::new(db.clone()));
        let data_source_repository = Box::new(DataSourceRepository::new(db.clone()));
        let validation_schema_repository = Box::new(ValidationSchemaRepository::new(db.clone()));
        let data_store_repository = Box::new(DataStoreRepository::new(db.clone()));
        let component_factory = Box::new(InfrastructurePipelineComponentFactory::new());
        let license_repository = Box::new(SqliteLicenseRepository::new(db.clone()));
        let plan_repository: Arc<dyn PlanRepository> =
            Arc::new(SqlitePlansRepository::new(db.clone()));

        let use_case = PipelineLifecycleCasesImpl::new(
            pipeline_lifecycle,
            pipeline_controller,
            data_source_repository,
            validation_schema_repository,
            data_store_repository,
            component_factory,
            license_repository,
            plan_repository,
        );

        if let Err(e) = use_case.start_all_pipelines_in_system().await {
            LOGGER.error(&format!("Fatal error during pipeline startup: {}", e));
        }
    }
}
