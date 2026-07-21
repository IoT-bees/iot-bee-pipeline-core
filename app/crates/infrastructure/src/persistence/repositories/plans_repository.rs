use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};

use domain::error::PlanError;
use domain::plan::entities::plan::{NewPlan, Plan, UpdatePlan};
use domain::plan::outbound::plan_repository::PlanRepository;

use crate::persistence::connection::InternalDataBase;

pub struct PostgresPlansRepository {
    db: Arc<InternalDataBase>,
}

impl PostgresPlansRepository {
    pub fn new(db: Arc<InternalDataBase>) -> Self {
        Self { db }
    }
}

fn parse_dt(raw: &str) -> DateTime<Utc> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
        .map(|n| n.and_utc())
        .unwrap_or_else(|_| Utc::now())
}

#[derive(sqlx::FromRow)]
struct Row {
    id: i64,
    slug: String,
    organization_id: Option<i64>,
    display_name: String,
    description: Option<String>,
    price_cents: i64,
    currency: String,
    max_pipelines: i64,
    max_replicas_per_pipeline: i64,
    included_messages_monthly: i64,
    alerts_enabled: bool,
    premium_connectors: bool,
    multi_user: bool,
    is_custom: bool,
    stripe_price_id: Option<String>,
    created_at: String,
    updated_at: String,
}

fn row_to_plan(r: Row) -> Plan {
    Plan {
        id: r.id,
        slug: r.slug,
        organization_id: r.organization_id,
        display_name: r.display_name,
        description: r.description,
        price_cents: r.price_cents,
        currency: r.currency,
        max_pipelines: r.max_pipelines,
        max_replicas_per_pipeline: r.max_replicas_per_pipeline,
        included_messages_monthly: r.included_messages_monthly,
        alerts_enabled: r.alerts_enabled,
        premium_connectors: r.premium_connectors,
        multi_user: r.multi_user,
        is_custom: r.is_custom,
        stripe_price_id: r.stripe_price_id,
        created_at: parse_dt(&r.created_at),
        updated_at: parse_dt(&r.updated_at),
    }
}

const SELECT_ALL: &str = "SELECT id, slug, organization_id, display_name, description, price_cents, currency, max_pipelines, max_replicas_per_pipeline, included_messages_monthly, alerts_enabled, premium_connectors, multi_user, is_custom, stripe_price_id, created_at, updated_at FROM plans";

#[async_trait]
impl PlanRepository for PostgresPlansRepository {
    async fn list_visible_to(&self, organization_id: i64) -> Result<Vec<Plan>, PlanError> {
        let rows: Vec<Row> = sqlx::query_as(&format!(
            "{} WHERE organization_id IS NULL OR organization_id = $1 ORDER BY organization_id IS NOT NULL, price_cents ASC, id ASC",
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
        let row: Option<Row> = sqlx::query_as(&format!("{} WHERE id = $1", SELECT_ALL))
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
            "{} WHERE slug = $1 AND organization_id = $2 LIMIT 1",
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
            "{} WHERE slug = $1 AND organization_id IS NULL LIMIT 1",
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
        let (id,): (i64,) = sqlx::query_as(
            "INSERT INTO plans (slug, organization_id, display_name, description, price_cents, currency, max_pipelines, max_replicas_per_pipeline, included_messages_monthly, alerts_enabled, premium_connectors, multi_user, is_custom, stripe_price_id) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id",
        )
        .bind(&p.slug)
        .bind(p.organization_id)
        .bind(&p.display_name)
        .bind(&p.description)
        .bind(p.price_cents)
        .bind(&p.currency)
        .bind(p.max_pipelines)
        .bind(p.max_replicas_per_pipeline)
        .bind(p.included_messages_monthly)
        .bind(p.alerts_enabled)
        .bind(p.premium_connectors)
        .bind(p.multi_user)
        .bind(p.is_custom)
        .bind(&p.stripe_price_id)
        .fetch_one(self.db.pool())
        .await
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("UNIQUE") {
                PlanError::SlugTaken { slug: p.slug.clone() }
            } else {
                PlanError::Internal { reason: msg }
            }
        })?;
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
        let included_messages_monthly = patch
            .included_messages_monthly
            .unwrap_or(current.included_messages_monthly);
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
            "UPDATE plans SET display_name = $1, description = $2, price_cents = $3, currency = $4, max_pipelines = $5, max_replicas_per_pipeline = $6, included_messages_monthly = $7, alerts_enabled = $8, premium_connectors = $9, multi_user = $10, stripe_price_id = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12",
        )
        .bind(&display_name)
        .bind(&description)
        .bind(price_cents)
        .bind(&currency)
        .bind(max_pipelines)
        .bind(max_replicas)
        .bind(included_messages_monthly)
        .bind(alerts)
        .bind(premium)
        .bind(multi_user)
        .bind(&stripe_price_id)
        .bind(id)
        .execute(self.db.pool())
        .await
        .map_err(|e| PlanError::Internal { reason: e.to_string() })?;

        self.find_by_id(id).await?.ok_or(PlanError::NotFound { id })
    }

    async fn delete(&self, id: i64) -> Result<(), PlanError> {
        let res = sqlx::query("DELETE FROM plans WHERE id = $1")
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
