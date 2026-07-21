use adapters::actor_system::supervisor_actor_system::actor_wrapper::PipelineActorSupervisorSystemBridge;

use application::pipeline_lifecycle_cases::cases::{
    PipelineLifecycleCases, PipelineLifecycleCasesImpl,
};

use application::notifications_cases::cases::{NotificationsUseCases, NotificationsUseCasesImpl};
use application::usage_cases::cases::UsageUseCasesImpl;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::auth::outbound::user_repository::UserRepository;
use domain::notifications::outbound::notifier::Notifier;
use domain::plan::outbound::plan_repository::PlanRepository;
use domain::usage::outbound::{UsageMeter, UsageRepository};
use infrastructure::notifications::log_notifier::LogNotifier;
use infrastructure::persistence::connection::InternalDataBase;
use infrastructure::persistence::repositories::{
    audit_events_repository::PostgresAuditEventsRepository,
    usage_repository::PostgresUsageRepository, users_repository::PostgresUserRepository,
};
use infrastructure::persistence::repositories::{
    data_source_repository::DataSourceRepository, data_store_repository::DataStoreRepository,
    license_repository::PostgresLicenseRepository,
    pipeline_data_repository::PipelineDataRepository, plans_repository::PostgresPlansRepository,
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
        let license_repository = Box::new(PostgresLicenseRepository::new(db.clone()));
        let plan_repository: Arc<dyn PlanRepository> =
            Arc::new(PostgresPlansRepository::new(db.clone()));
        let usage_repo: Arc<dyn UsageRepository> =
            Arc::new(PostgresUsageRepository::new(db.clone()));
        let users: Arc<dyn UserRepository> = Arc::new(PostgresUserRepository::new(db.clone()));
        let audit: Arc<dyn AuditRepository> =
            Arc::new(PostgresAuditEventsRepository::new(db.clone()));
        let notifier: Arc<dyn Notifier> = Arc::new(LogNotifier);
        let notifications: Arc<dyn NotificationsUseCases> =
            Arc::new(NotificationsUseCasesImpl::new(notifier));
        let usage_meter: Arc<dyn UsageMeter> = Arc::new(UsageUseCasesImpl::new(
            usage_repo,
            Arc::new(PostgresLicenseRepository::new(db.clone())),
            plan_repository.clone(),
            users,
            notifications,
            audit,
        ));

        let use_case = PipelineLifecycleCasesImpl::new(
            pipeline_lifecycle,
            pipeline_controller,
            data_source_repository,
            validation_schema_repository,
            data_store_repository,
            component_factory,
            license_repository,
            plan_repository,
            usage_meter,
        );

        if let Err(e) = use_case.start_all_pipelines_in_system().await {
            LOGGER.error(&format!("Fatal error during pipeline startup: {}", e));
        }
    }
}
