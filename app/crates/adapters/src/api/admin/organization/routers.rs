use actix_web::{Scope, web};

use domain::organization::inbound::organization_uses::OrganizationUseCases;

use super::handlers;

pub fn organization_scope(uc: web::Data<dyn OrganizationUseCases + Send + Sync>) -> Scope {
    web::scope("/organization")
        .app_data(uc)
        .service(handlers::read)
        .service(handlers::patch)
}
