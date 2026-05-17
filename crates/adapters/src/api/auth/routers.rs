use actix_web::{Scope, web};

use domain::auth::inbound::auth_uses::AuthUseCases;

use super::handlers;

pub fn auth_scope(use_case: web::Data<dyn AuthUseCases + Send + Sync>) -> Scope {
    web::scope("/auth")
        .app_data(use_case)
        .service(handlers::register)
        .service(handlers::login)
        .service(handlers::has_users)
        .service(handlers::me)
}
