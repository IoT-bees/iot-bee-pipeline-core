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

// para los casos de uso de licencias
use application::license_cases::cases::LicenseUseCases;
use application::license_cases::cases::LicenseUseCasesImpl;
use infrastructure::persistence::repositories::license_repository::SqliteLicenseRepository;

// // para los casos de uso de pipeline lifecycle
use application::pipeline_lifecycle_cases::cases::PipelineLifecycleCases;
use application::pipeline_lifecycle_cases::cases::PipelineLifecycleCasesImpl;
use infrastructure::pipeline_component_factory::infra_pipeline_component_factory::InfrastructurePipelineComponentFactory;

use adapters::actor_system::supervisor_actor_system::actor_wrapper::PipelineActorSupervisorSystemBridge;

// para los casos de uso de auth
use application::auth_cases::cases::AuthUseCasesImpl;
use domain::auth::entities::user::NewUser;
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::auth::outbound::password_hasher::PasswordHasher;
use domain::auth::outbound::user_repository::UserRepository;
use infrastructure::persistence::repositories::users_repository::SqliteUserRepository;
use infrastructure::security::argon2_hasher::Argon2Hasher;
use infrastructure::security::jwt_issuer::JwtIssuer;

use actix_web::web;

use application::audit_cases::cases::purge_audit_older_than;
use infrastructure::persistence::connection::InternalDataBase;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::interval;

// Admin / audit / system / organization wiring
use application::audit_cases::cases::AuditUseCasesImpl;
use application::organization_cases::cases::OrganizationUseCasesImpl;
use application::plan_cases::cases::PlanUseCasesImpl;
use application::system_cases::cases::SystemUseCasesImpl;
use application::user_admin_cases::cases::UserAdminUseCasesImpl;
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::auth::inbound::user_admin_uses::UserAdminUseCases;
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::plan::inbound::plan_uses::PlanUseCases;
use domain::plan::outbound::plan_repository::PlanRepository;
use domain::system::inbound::system_uses::SystemUseCases;
use infrastructure::persistence::repositories::audit_events_repository::SqliteAuditEventsRepository;
use infrastructure::persistence::repositories::organizations_repository::SqliteOrganizationsRepository;
use infrastructure::persistence::repositories::plans_repository::SqlitePlansRepository;
use infrastructure::system::status_probe::SystemStatusProbeImpl;

// Notifications wiring
use application::notifications_cases::cases::{NotificationsUseCases, NotificationsUseCasesImpl};
use domain::notifications::outbound::notifier::Notifier;
use infrastructure::notifications::log_notifier::LogNotifier;
use infrastructure::notifications::resend_notifier::ResendNotifier;

use crate::config::Config;

pub struct AppState {
    internal_data_base: Arc<InternalDataBase>,
    pub config: &'static Config,
    pub process_start: Instant,
    notifications: Arc<dyn NotificationsUseCases>,
}

impl AppState {
    pub fn new(internal_data_base: Arc<InternalDataBase>) -> Self {
        let config = Config::get();
        let notifier: Arc<dyn Notifier> = match (
            std::env::var("RESEND_API_KEY").ok(),
            std::env::var("EMAIL_FROM").ok(),
        ) {
            (Some(api_key), Some(from)) if !api_key.is_empty() && !from.is_empty() => Arc::new(
                ResendNotifier::new(api_key, from, std::env::var("EMAIL_REPLY_TO").ok()),
            ),
            _ => Arc::new(LogNotifier),
        };
        let notifications: Arc<dyn NotificationsUseCases> =
            Arc::new(NotificationsUseCasesImpl::new(notifier));
        let audit_repo_for_cron: Arc<dyn AuditRepository> =
            Arc::new(SqliteAuditEventsRepository::new(internal_data_base.clone()));
        let retention_days = config.audit_retention_days;
        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(3600));
            loop {
                ticker.tick().await;
                match purge_audit_older_than(audit_repo_for_cron.as_ref(), retention_days).await {
                    Ok(n) => tracing::info!(
                        "audit retention: purged {} rows older than {} days",
                        n,
                        retention_days
                    ),
                    Err(e) => {
                        tracing::warn!("audit retention purge failed: {}", e)
                    }
                }
            }
        });
        Self {
            internal_data_base,
            config,
            process_start: Instant::now(),
            notifications,
        }
    }

    pub fn notifications(&self) -> Arc<dyn NotificationsUseCases> {
        self.notifications.clone()
    }

    pub fn internal_data_base(&self) -> Arc<InternalDataBase> {
        self.internal_data_base.clone()
    }

    pub async fn build_db() -> Result<Arc<InternalDataBase>, Box<dyn std::error::Error>> {
        let config = Config::get();
        let db = Arc::new(InternalDataBase::new(&config.database_url).await?);
        sqlx::migrate!("./migrations").run(db.pool()).await?;
        Ok(db)
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
        let license_repo: Arc<SqliteLicenseRepository> = Arc::new(SqliteLicenseRepository::new(
            self.internal_data_base.clone(),
        ));
        let pipeline_data_use_case: Arc<dyn PipelineDataUseCases + Send + Sync> = Arc::new(
            PipelineDataUseCasesImpl::new(pipeline_data_repo, license_repo, self.plan_repo()),
        );
        web::Data::from(pipeline_data_use_case)
    }

    pub fn license_app_state(&self) -> web::Data<dyn LicenseUseCases + Send + Sync> {
        let license_repo: Arc<SqliteLicenseRepository> = Arc::new(SqliteLicenseRepository::new(
            self.internal_data_base.clone(),
        ));
        let users_repo: Arc<dyn UserRepository> =
            Arc::new(SqliteUserRepository::new(self.internal_data_base.clone()));
        let license_use_case: Arc<dyn LicenseUseCases + Send + Sync> =
            Arc::new(LicenseUseCasesImpl::new(
                license_repo,
                users_repo,
                self.notifications(),
                self.plan_repo(),
            ));
        web::Data::from(license_use_case)
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
        let license_repository = Box::new(SqliteLicenseRepository::new(
            self.internal_data_base.clone(),
        ));

        let use_case = PipelineLifecycleCasesImpl::new(
            pipeline_lifecycle,
            pipeline_controller,
            data_source_repository,
            validation_schema_repository,
            data_store_repository,
            component_factory,
            license_repository,
            self.plan_repo(),
        );
        let use_case: Arc<dyn PipelineLifecycleCases + Send + Sync> = Arc::new(use_case);
        web::Data::from(use_case)
    }

    pub async fn ensure_default_admin(&self) {
        let repo = SqliteUserRepository::new(self.internal_data_base.clone());
        let email = &self.config.admin_email;

        match repo.find_by_email(email).await {
            Ok(Some(_)) => {
                tracing::info!(
                    "Admin por defecto '{}' ya existe, no se vuelve a crear",
                    email
                );
                return;
            }
            Ok(None) => {}
            Err(e) => {
                tracing::error!("No se pudo verificar el admin por defecto: {}", e);
                return;
            }
        }

        let hasher = Argon2Hasher::new();
        let password_hash = match hasher.hash(&self.config.admin_password) {
            Ok(h) => h,
            Err(e) => {
                tracing::error!(
                    "No se pudo hashear la contraseña del admin por defecto: {}",
                    e
                );
                return;
            }
        };

        let new_user = NewUser {
            organization_id: 1,
            email: email.clone(),
            name: self.config.admin_name.clone(),
            password_hash,
            role: "admin".into(),
            status: "active".into(),
            must_reset_password: false,
        };

        match repo.create(new_user).await {
            Ok(_) => tracing::info!(
                "Admin por defecto creado: '{}' (cambia ADMIN_PASSWORD en producción)",
                email
            ),
            Err(e) => tracing::error!("No se pudo crear el admin por defecto: {}", e),
        }
    }

    pub fn auth_app_state(&self) -> web::Data<dyn AuthUseCases + Send + Sync> {
        let repo = Arc::new(SqliteUserRepository::new(self.internal_data_base.clone()));
        let hasher = Arc::new(Argon2Hasher::new());
        let issuer = Arc::new(JwtIssuer::new(
            self.config.jwt_secret.clone(),
            self.config.jwt_expires_in_hours,
        ));
        let uc: Arc<dyn AuthUseCases + Send + Sync> = Arc::new(AuthUseCasesImpl::new(
            repo,
            hasher,
            issuer,
            self.notifications(),
        ));
        web::Data::from(uc)
    }

    pub fn audit_repo(&self) -> Arc<dyn AuditRepository> {
        Arc::new(SqliteAuditEventsRepository::new(
            self.internal_data_base.clone(),
        ))
    }

    pub fn audit_app_state(&self) -> web::Data<dyn AuditUseCases + Send + Sync> {
        let repo = self.audit_repo();
        let uc: Arc<dyn AuditUseCases + Send + Sync> = Arc::new(AuditUseCasesImpl::new(repo));
        web::Data::from(uc)
    }

    pub fn system_app_state(&self) -> web::Data<dyn SystemUseCases + Send + Sync> {
        let probe = Arc::new(SystemStatusProbeImpl::new(
            self.internal_data_base.clone(),
            self.process_start,
            self.config.rabbitmq_url.clone(),
        ));
        let uc: Arc<dyn SystemUseCases + Send + Sync> = Arc::new(SystemUseCasesImpl::new(probe));
        web::Data::from(uc)
    }

    pub fn user_admin_app_state(&self) -> web::Data<dyn UserAdminUseCases + Send + Sync> {
        let repo = Arc::new(SqliteUserRepository::new(self.internal_data_base.clone()));
        let hasher = Arc::new(Argon2Hasher::new());
        let uc: Arc<dyn UserAdminUseCases + Send + Sync> = Arc::new(UserAdminUseCasesImpl::new(
            repo,
            hasher,
            self.notifications(),
        ));
        web::Data::from(uc)
    }

    pub fn organization_app_state(&self) -> web::Data<dyn OrganizationUseCases + Send + Sync> {
        let repo = Arc::new(SqliteOrganizationsRepository::new(
            self.internal_data_base.clone(),
        ));
        let uc: Arc<dyn OrganizationUseCases + Send + Sync> =
            Arc::new(OrganizationUseCasesImpl::new(repo));
        web::Data::from(uc)
    }

    pub fn plan_repo(&self) -> Arc<dyn PlanRepository> {
        Arc::new(SqlitePlansRepository::new(self.internal_data_base.clone()))
    }

    pub fn plans_app_state(&self) -> web::Data<dyn PlanUseCases + Send + Sync> {
        let uc: Arc<dyn PlanUseCases + Send + Sync> =
            Arc::new(PlanUseCasesImpl::new(self.plan_repo()));
        web::Data::from(uc)
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
        let license_repository = Box::new(SqliteLicenseRepository::new(
            self.internal_data_base.clone(),
        ));

        let use_case = PipelineLifecycleCasesImpl::new(
            pipeline_lifecycle,
            pipeline_controller,
            data_source_repository,
            validation_schema_repository,
            data_store_repository,
            component_factory,
            license_repository,
            self.plan_repo(),
        );

        if let Err(e) = use_case.start_all_pipelines_in_system().await {
            tracing::error!("Fatal error during pipeline startup: {}", e);
        }
    }
}
