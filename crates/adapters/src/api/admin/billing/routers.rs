use actix_web::{Scope, web};

use application::license_cases::cases::LicenseUseCases;

use super::handlers;

pub fn billing_scope(uc: web::Data<dyn LicenseUseCases + Send + Sync>) -> Scope {
    web::scope("/billing").service(
        web::scope("/events")
            .app_data(uc)
            .service(handlers::list)
            .service(handlers::retry),
    )
}
