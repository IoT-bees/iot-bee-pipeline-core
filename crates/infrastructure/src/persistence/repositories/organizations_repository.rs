use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};

use domain::error::OrganizationError;
use domain::organization::entities::organization::{Organization, UpdateOrganization};
use domain::organization::outbound::organization_repository::OrganizationRepository;

use crate::persistence::connection::InternalDataBase;

pub struct SqliteOrganizationsRepository {
    db: Arc<InternalDataBase>,
}

impl SqliteOrganizationsRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self {
        Self { db }
    }
}

fn parse_dt(raw: &str) -> DateTime<Utc> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .map(|n| n.and_utc())
        .unwrap_or_else(|_| Utc::now())
}

#[async_trait]
impl OrganizationRepository for SqliteOrganizationsRepository {
    async fn find_by_id(&self, id: i64) -> Result<Option<Organization>, OrganizationError> {
        let row: Option<(i64, String, String, String, String)> = sqlx::query_as(
            "SELECT id, name, slug, created_at, updated_at FROM organizations WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| OrganizationError::Internal {
            reason: e.to_string(),
        })?;
        Ok(row.map(|(id, name, slug, ca, ua)| Organization {
            id,
            name,
            slug,
            created_at: parse_dt(&ca),
            updated_at: parse_dt(&ua),
        }))
    }

    async fn update(
        &self,
        id: i64,
        patch: UpdateOrganization,
    ) -> Result<Organization, OrganizationError> {
        let current = self
            .find_by_id(id)
            .await?
            .ok_or(OrganizationError::NotFound { id })?;
        let new_name = patch.name.unwrap_or(current.name);
        let new_slug = patch.slug.unwrap_or(current.slug);

        let res = sqlx::query(
            "UPDATE organizations SET name = ?, slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(&new_name)
        .bind(&new_slug)
        .bind(id)
        .execute(self.db.pool())
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("UNIQUE") {
                OrganizationError::SlugTaken {
                    slug: new_slug.clone(),
                }
            } else {
                OrganizationError::Internal { reason: msg }
            }
        })?;

        if res.rows_affected() == 0 {
            return Err(OrganizationError::NotFound { id });
        }
        self.find_by_id(id)
            .await?
            .ok_or(OrganizationError::Internal {
                reason: "missing after update".into(),
            })
    }
}
