use std::sync::Arc;

use async_trait::async_trait;

use domain::error::SystemError;
use domain::system::entities::contact_settings::{ContactSettings, UpdateContactSettings};
use domain::system::entities::system_status::SystemStatus;
use domain::system::inbound::system_uses::SystemUseCases;
use domain::system::outbound::contact_settings_repository::ContactSettingsRepository;
use domain::system::outbound::system_status_probe::SystemStatusProbe;

pub struct SystemUseCasesImpl {
    probe: Arc<dyn SystemStatusProbe>,
    contact_settings: Arc<dyn ContactSettingsRepository>,
}

impl SystemUseCasesImpl {
    pub fn new(
        probe: Arc<dyn SystemStatusProbe>,
        contact_settings: Arc<dyn ContactSettingsRepository>,
    ) -> Self {
        Self {
            probe,
            contact_settings,
        }
    }
}

fn is_valid_email(value: &str) -> bool {
    let value = value.trim();
    value.len() <= 254
        && value
            .split_once('@')
            .is_some_and(|(local, domain)| !local.is_empty() && domain.contains('.'))
}

fn normalize_whatsapp(value: Option<String>) -> Result<Option<String>, SystemError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let digits = value
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>();
    if digits.is_empty() {
        return Ok(None);
    }
    if !(8..=15).contains(&digits.len()) {
        return Err(SystemError::InvalidContactSettings {
            reason: "el número de WhatsApp debe tener entre 8 y 15 dígitos".into(),
        });
    }
    Ok(Some(digits))
}

#[async_trait]
impl SystemUseCases for SystemUseCasesImpl {
    async fn status(&self) -> Result<SystemStatus, SystemError> {
        self.probe.probe().await
    }

    async fn contact_settings(&self) -> Result<ContactSettings, SystemError> {
        self.contact_settings.read().await
    }

    async fn update_contact_settings(
        &self,
        settings: UpdateContactSettings,
    ) -> Result<ContactSettings, SystemError> {
        let contact_email = settings.contact_email.trim().to_lowercase();
        if !is_valid_email(&contact_email) {
            return Err(SystemError::InvalidContactSettings {
                reason: "el correo de contacto no es válido".into(),
            });
        }
        self.contact_settings
            .update(UpdateContactSettings {
                contact_email,
                whatsapp_number: normalize_whatsapp(settings.whatsapp_number)?,
            })
            .await
    }
}
