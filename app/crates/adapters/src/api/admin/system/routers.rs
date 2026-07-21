use actix_web::{Scope, web};

use domain::system::inbound::system_uses::SystemUseCases;

use super::handlers;

pub fn system_scope(uc: web::Data<dyn SystemUseCases + Send + Sync>) -> Scope {
    web::scope("/system")
        .app_data(uc)
        .service(handlers::status)
        .service(handlers::contact_settings)
        .service(handlers::update_contact_settings)
}
