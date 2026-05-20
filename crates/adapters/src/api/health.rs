use std::sync::Arc;

use actix_web::{HttpResponse, Scope, get, web};
use serde_json::json;

use infrastructure::persistence::connection::InternalDataBase;

pub fn health_scope(db: Arc<InternalDataBase>) -> Scope {
    web::scope("/health")
        .app_data(web::Data::from(db))
        .service(health)
}

#[get("")]
pub async fn health(db: web::Data<InternalDataBase>) -> HttpResponse {
    match db.ping().await {
        Ok(()) => HttpResponse::Ok().json(json!({"status": "ok"})),
        Err(_) => HttpResponse::ServiceUnavailable().json(json!({"status": "unhealthy"})),
    }
}
