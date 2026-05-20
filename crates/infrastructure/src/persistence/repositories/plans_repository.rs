use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};

use domain::error::PlanError;
use domain::plan::entities::plan::{NewPlan, Plan, UpdatePlan};
use domain::plan::outbound::plan_repository::PlanRepository;

use crate::persistence::connection::InternalDataBase;

pub struct SqlitePlansRepository {
    db: Arc<InternalDataBase>,
}

impl SqlitePlansRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self {
        Self { db }
    }
}

fn parse_dt(raw: &str) -> DateTime<Utc> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .map(|n| n.and_utc())
        .unwrap_or_else(|_| Utc::now())
}

#[allow(clippy::type_complexity)]
type Row = (
    i64,            // id
    String,         // slug
    Option<i64>,    // organization_id
    String,         // display_name
    Option<String>, // description
    i64,            // price_cents
    String,         // currency
    i64,            // max_pipelines
    i64,            // max_replicas_per_pipeline
    i64,            // alerts_enabled
    i64,            // premium_connectors
    i64,            // multi_user
    i64,            // is_custom
    Option<String>, // stripe_price_id
    String,         // created_at
    String,         // updated_at
);

fn row_to_plan(r: Row) -> Plan {
    Plan {
        id: r.0,
        slug: r.1,
        organization_id: r.2,
        display_name: r.3,
        description: r.4,
        price_cents: r.5,
        currency: r.6,
        max_pipelines: r.7,
        max_replicas_per_pipeline: r.8,
        alerts_enabled: r.9 != 0,
        premium_connectors: r.10 != 0,
        multi_user: r.11 != 0,
        is_custom: r.12 != 0,
        stripe_price_id: r.13,
        created_at: parse_dt(&r.14),
        updated_at: parse_dt(&r.15),
    }
}

const SELECT_ALL: &str = "SELECT id, slug, organization_id, display_name, description, price_cents, currency, max_pipelines, max_replicas_per_pipeline, alerts_enabled, premium_connectors, multi_user, is_custom, stripe_price_id, created_at, updated_at FROM plans";

#[async_trait]
impl PlanRepository for SqlitePlansRepository {
    async fn list_visible_to(&self, organization_id: i64) -> Result<Vec<Plan>, PlanError> {
        let rows: Vec<Row> = sqlx::query_as(&format!(
            "{} WHERE organization_id IS NULL OR organization_id = ? ORDER BY organization_id IS NOT NULL, price_cents ASC, id ASC",
            SELECT_ALL
        ))
        .bind(organization_id)
        .fetch_all(self.db.pool())
        .await
        .map_err(|e| PlanError::Internal { reason: e.to_string() })?;
        Ok(rows.into_iter().map(row_to_plan).collect())
    }

    async fn list_global(&self) -> Result<Vec<Plan>, PlanError> {
        let rows: Vec<Row> = sqlx::query_as(&format!(
            "{} WHERE organization_id IS NULL ORDER BY price_cents ASC, id ASC",
            SELECT_ALL
        ))
        .fetch_all(self.db.pool())
        .await
        .map_err(|e| PlanError::Internal {
            reason: e.to_string(),
        })?;
        Ok(rows.into_iter().map(row_to_plan).collect())
    }

    async fn find_by_id(&self, id: i64) -> Result<Option<Plan>, PlanError> {
        let row: Option<Row> = sqlx::query_as(&format!("{} WHERE id = ?", SELECT_ALL))
            .bind(id)
            .fetch_optional(self.db.pool())
            .await
            .map_err(|e| PlanError::Internal {
                reason: e.to_string(),
            })?;
        Ok(row.map(row_to_plan))
    }

    async fn find_effective(
        &self,
        slug: &str,
        organization_id: i64,
    ) -> Result<Option<Plan>, PlanError> {
        // Custom override first.
        let custom: Option<Row> = sqlx::query_as(&format!(
            "{} WHERE slug = ? AND organization_id = ? LIMIT 1",
            SELECT_ALL
        ))
        .bind(slug)
        .bind(organization_id)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| PlanError::Internal {
            reason: e.to_string(),
        })?;
        if let Some(r) = custom {
            return Ok(Some(row_to_plan(r)));
        }
        let global: Option<Row> = sqlx::query_as(&format!(
            "{} WHERE slug = ? AND organization_id IS NULL LIMIT 1",
            SELECT_ALL
        ))
        .bind(slug)
        .fetch_optional(self.db.pool())
        .await
        .map_err(|e| PlanError::Internal {
            reason: e.to_string(),
        })?;
        Ok(global.map(row_to_plan))
    }

    async fn create(&self, p: NewPlan) -> Result<Plan, PlanError> {
        let res = sqlx::query(
            "INSERT INTO plans (slug, organization_id, display_name, description, price_cents, currency, max_pipelines, max_replicas_per_pipeline, alerts_enabled, premium_connectors, multi_user, is_custom, stripe_price_id) \
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&p.slug)
        .bind(p.organization_id)
        .bind(&p.display_name)
        .bind(&p.description)
        .bind(p.price_cents)
        .bind(&p.currency)
        .bind(p.max_pipelines)
        .bind(p.max_replicas_per_pipeline)
        .bind(if p.alerts_enabled { 1_i64 } else { 0_i64 })
        .bind(if p.premium_connectors { 1_i64 } else { 0_i64 })
        .bind(if p.multi_user { 1_i64 } else { 0_i64 })
        .bind(if p.is_custom { 1_i64 } else { 0_i64 })
        .bind(&p.stripe_price_id)
        .execute(self.db.pool())
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("UNIQUE") {
                PlanError::SlugTaken { slug: p.slug.clone() }
            } else {
                PlanError::Internal { reason: msg }
            }
        })?;
        let id = res.last_insert_rowid();
        self.find_by_id(id).await?.ok_or(PlanError::Internal {
            reason: "plan missing after insert".into(),
        })
    }

    async fn update(&self, id: i64, patch: UpdatePlan) -> Result<Plan, PlanError> {
        let current = self
            .find_by_id(id)
            .await?
            .ok_or(PlanError::NotFound { id })?;

        let display_name = patch.display_name.unwrap_or(current.display_name);
        let description = match patch.description {
            Some(d) => d,
            None => current.description,
        };
        let price_cents = patch.price_cents.unwrap_or(current.price_cents);
        let currency = patch.currency.unwrap_or(current.currency);
        let max_pipelines = patch.max_pipelines.unwrap_or(current.max_pipelines);
        let max_replicas = patch
            .max_replicas_per_pipeline
            .unwrap_or(current.max_replicas_per_pipeline);
        let alerts = patch.alerts_enabled.unwrap_or(current.alerts_enabled);
        let premium = patch
            .premium_connectors
            .unwrap_or(current.premium_connectors);
        let multi_user = patch.multi_user.unwrap_or(current.multi_user);
        let stripe_price_id = match patch.stripe_price_id {
            Some(s) => s,
            None => current.stripe_price_id,
        };

        sqlx::query(
            "UPDATE plans SET display_name = ?, description = ?, price_cents = ?, currency = ?, max_pipelines = ?, max_replicas_per_pipeline = ?, alerts_enabled = ?, premium_connectors = ?, multi_user = ?, stripe_price_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .bind(&display_name)
        .bind(&description)
        .bind(price_cents)
        .bind(&currency)
        .bind(max_pipelines)
        .bind(max_replicas)
        .bind(if alerts { 1_i64 } else { 0_i64 })
        .bind(if premium { 1_i64 } else { 0_i64 })
        .bind(if multi_user { 1_i64 } else { 0_i64 })
        .bind(&stripe_price_id)
        .bind(id)
        .execute(self.db.pool())
        .await
        .map_err(|e| PlanError::Internal { reason: e.to_string() })?;

        self.find_by_id(id).await?.ok_or(PlanError::NotFound { id })
    }

    async fn delete(&self, id: i64) -> Result<(), PlanError> {
        let res = sqlx::query("DELETE FROM plans WHERE id = ?")
            .bind(id)
            .execute(self.db.pool())
            .await
            .map_err(|e| PlanError::Internal {
                reason: e.to_string(),
            })?;
        if res.rows_affected() == 0 {
            return Err(PlanError::NotFound { id });
        }
        Ok(())
    }
}
