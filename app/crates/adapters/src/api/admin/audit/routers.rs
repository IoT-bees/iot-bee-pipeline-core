use actix_web::{Scope, web};

use domain::audit::inbound::audit_uses::AuditUseCases;

use super::handlers;

pub fn audit_scope(uc: web::Data<dyn AuditUseCases + Send + Sync>) -> Scope {
    web::scope("/audit").app_data(uc).service(handlers::list)
}
