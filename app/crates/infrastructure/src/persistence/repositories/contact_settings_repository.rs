use std::sync::Arc;

use async_trait::async_trait;

use domain::error::SystemError;
use domain::system::entities::contact_settings::{ContactSettings, UpdateContactSettings};
use domain::system::outbound::contact_settings_repository::ContactSettingsRepository;

use crate::persistence::connection::InternalDataBase;

pub struct PostgresContactSettingsRepository {
    db: Arc<InternalDataBase>,
}

impl PostgresContactSettingsRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ContactSettingsRepository for PostgresContactSettingsRepository {
    async fn read(&self) -> Result<ContactSettings, SystemError> {
        let (contact_email, whatsapp_number): (String, Option<String>) = sqlx::query_as(
            "SELECT contact_email, whatsapp_number FROM contact_settings WHERE id = 1",
        )
        .fetch_one(self.db.pool())
        .await
        .map_err(|e| SystemError::Persistence {
            reason: e.to_string(),
        })?;
        Ok(ContactSettings {
            contact_email,
            whatsapp_number,
        })
    }

    async fn update(
        &self,
        settings: UpdateContactSettings,
    ) -> Result<ContactSettings, SystemError> {
        sqlx::query(
            "UPDATE contact_settings SET contact_email = $1, whatsapp_number = $2, updated_at = to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') WHERE id = 1",
        )
        .bind(&settings.contact_email)
        .bind(&settings.whatsapp_number)
        .execute(self.db.pool())
        .await
        .map_err(|e| SystemError::Persistence {
            reason: e.to_string(),
        })?;
        self.read().await
    }
}
