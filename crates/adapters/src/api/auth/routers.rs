use std::sync::Arc;

use actix_web::{Scope, web};

use domain::audit::outbound::audit_repository::AuditRepository;
use domain::auth::inbound::auth_uses::AuthUseCases;

use super::handlers;

pub fn auth_scope(
    use_case: web::Data<dyn AuthUseCases + Send + Sync>,
    audit_repo: Arc<dyn AuditRepository>,
) -> Scope {
    web::scope("/auth")
        .app_data(use_case)
        .app_data(web::Data::from(audit_repo))
        .service(handlers::register)
        .service(handlers::login)
        .service(handlers::has_users)
        .service(handlers::me)
}
