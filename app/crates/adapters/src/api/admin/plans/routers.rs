use actix_web::{Scope, web};

use domain::plan::inbound::plan_uses::PlanUseCases;

use super::handlers;

pub fn plans_scope(uc: web::Data<dyn PlanUseCases + Send + Sync>) -> Scope {
    web::scope("/plans")
        .app_data(uc)
        .service(handlers::list)
        .service(handlers::create)
        .service(handlers::patch_plan)
        .service(handlers::delete_plan)
}
