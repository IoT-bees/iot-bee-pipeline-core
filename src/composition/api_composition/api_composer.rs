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
use adapters::api::license::routers::license_scope;
//metrics (Prometheus, unauthenticated)
use adapters::api::metrics::metrics_scope;
//auth
use actix_cors::Cors;
use actix_web::web;
use adapters::api::admin::routers::{AdminUseCases, admin_scope};
use adapters::api::auth::middleware::JwtAuth;
use adapters::api::auth::routers::auth_scope;
use adapters::api::health::health_scope;
use adapters::api::ops_middleware::{AdminOnly, AuditLog, RateLimit, RolePolicy};
use adapters::api::plans::routers::plans_scope;

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
        let audit_uc = app_state.audit_app_state();
        let system_uc = app_state.system_app_state();
        let user_admin_uc = app_state.user_admin_app_state();
        let organization_uc = app_state.organization_app_state();
        let plans_uc = app_state.plans_app_state();
        let audit_repo = app_state.audit_repo();
        let health_db = app_state.internal_data_base();
        let cors_origins = app_state.config.cors_origins.clone();
        let rate_limit = RateLimit::default();
        let auth_rate_limit = RateLimit::with_limits(10, std::time::Duration::from_secs(60));
        let swagger_enabled = app_state.config.swagger_enabled;

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
                .wrap(rate_limit.clone())
                .wrap(cors)
                .configure(|cfg| {
                    if swagger_enabled {
                        cfg.service(
                            SwaggerUi::new("/swagger-ui/{_:.*}")
                                .url("/api-docs/openapi.json", ApiDoc::openapi()),
                        );
                    }
                })
                .service(health_scope(health_db.clone()))
                .service(metrics_scope().app_data(pipeline_lifecycle.clone()))
                .service(auth_scope(auth.clone(), audit_repo.clone()).wrap(auth_rate_limit.clone()))
                .service(
                    web::scope("")
                        .app_data(auth.clone())
                        .wrap(AuditLog::new(audit_repo.clone()))
                        .wrap(RolePolicy)
                        .wrap(JwtAuth)
                        .service(connection_types_scope())
                        .service(validation_schemas_scope(validation_schemas.clone()))
                        .service(data_sources_scope(data_sources.clone()))
                        .service(pipeline_groups_scope(pipeline_groups.clone()))
                        .service(data_store_scope(data_stores.clone()))
                        .service(pipeline_data_scope(pipeline_data.clone()))
                        .service(pipeline_lifecycle_scope(pipeline_lifecycle.clone()))
                        .service(license_scope(license.clone(), pipeline_data.clone()))
                        .service(plans_scope(plans_uc.clone()))
                        .service(
                            admin_scope(AdminUseCases {
                                audit: audit_uc.clone(),
                                system: system_uc.clone(),
                                users: user_admin_uc.clone(),
                                organization: organization_uc.clone(),
                                plans: plans_uc.clone(),
                                license: license.clone(),
                                pipelines: pipeline_data.clone(),
                            })
                            .wrap(AdminOnly),
                        ),
                )
        })
        .bind(format!("{}:{}", host, port))?
        .run()
        .await
    }
}
