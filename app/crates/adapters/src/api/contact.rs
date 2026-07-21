use actix_web::{HttpResponse, Scope, get, web};
use serde::Serialize;

use domain::error::IoTBeeError;
use domain::system::inbound::system_uses::SystemUseCases;
use utoipa::ToSchema;

use crate::api::error::ApiError;

type UseCase = dyn SystemUseCases + Send + Sync;

#[derive(Serialize, ToSchema)]
pub struct PublicContactSettingsResponse {
    #[serde(rename = "contactEmail")]
    pub contact_email: String,
    #[serde(rename = "whatsappNumber")]
    pub whatsapp_number: Option<String>,
}

#[utoipa::path(
    get,
    path = "/contact-settings",
    responses((status = 200, description = "Public contact settings", body = PublicContactSettingsResponse)),
    tag = "Contact"
)]
#[get("")]
async fn get_contact_settings(uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let settings = uc
        .contact_settings()
        .await
        .map_err(|e| ApiError(IoTBeeError::SystemError(e)))?;
    Ok(HttpResponse::Ok().json(PublicContactSettingsResponse {
        contact_email: settings.contact_email,
        whatsapp_number: settings.whatsapp_number,
    }))
}

pub fn contact_scope(uc: web::Data<dyn SystemUseCases + Send + Sync>) -> Scope {
    web::scope("/contact-settings")
        .app_data(uc)
        .service(get_contact_settings)
}
