use actix_web::{Scope, web};

use domain::auth::inbound::user_admin_uses::UserAdminUseCases;

use super::handlers;

pub fn users_scope(uc: web::Data<dyn UserAdminUseCases + Send + Sync>) -> Scope {
    web::scope("/users")
        .app_data(uc)
        .service(handlers::list)
        .service(handlers::create)
        .service(handlers::patch_user)
        .service(handlers::deactivate)
}
