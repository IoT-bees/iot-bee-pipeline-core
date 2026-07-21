use crate::persistence::connection::InternalDataBase;
use crate::persistence::models::LicenseSubscriptionRow;
use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};
use domain::entities::license::{BillingEvent, LicenseSubscription, StripeBillingSync};
use domain::error::{IoTBeeError, LicenseError};
use domain::outbound::license_repository::LicenseRepository;
use std::sync::Arc;

pub struct PostgresLicenseRepository {
    database: Arc<InternalDataBase>,
}

impl PostgresLicenseRepository {
    pub fn new(database: Arc<InternalDataBase>) -> Self {
        Self { database }
    }

    fn pool(&self) -> &sqlx::PgPool {
        self.database.pool()
    }
}

/// Conserva solo el estado mínimo para reintentar la sincronización. El evento
/// crudo de Stripe puede traer metadatos arbitrarios y no debe persistirse.
fn billing_event_payload(sync: &StripeBillingSync) -> String {
    serde_json::json!({
        "licenseKey": sync.license_key,
        "plan": sync.plan.as_str(),
        "state": sync.state.as_str(),
        "stripeCustomerId": sync.stripe_customer_id,
        "stripeSubscriptionId": sync.stripe_subscription_id,
        "stripeCheckoutSessionId": sync.stripe_checkout_session_id,
        "stripeSubscriptionStatus": sync.stripe_subscription_status,
        "stripePaymentStatus": sync.stripe_payment_status,
        "currentPeriodEnd": sync.current_period_end.map(|value| value.to_rfc3339()),
        "cancelAtPeriodEnd": sync.cancel_at_period_end,
        "latestInvoiceId": sync.latest_invoice_id,
        "amountCents": sync.amount_cents,
        "currency": sync.currency,
        "stripeEventId": sync.stripe_event_id,
        "eventType": sync.event_type,
    })
    .to_string()
}

#[async_trait]
impl LicenseRepository for PostgresLicenseRepository {
    async fn get_subscription(
        &self,
        organization_id: i64,
    ) -> Result<Option<LicenseSubscription>, IoTBeeError> {
        let row = sqlx::query_as::<_, LicenseSubscriptionRow>(
            r#"
            SELECT license_key, plan, state, activated_at, expires_at, last_checked_at
                , stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id
                , stripe_subscription_status, stripe_payment_status, current_period_end
                , cancel_at_period_end, latest_invoice_id, amount_cents, currency
            FROM license_subscriptions
            WHERE organization_id = $1
            "#,
        )
        .bind(organization_id)
        .fetch_optional(self.pool())
        .await
        .map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;

        row.map(TryInto::try_into).transpose()
    }

    async fn upsert_subscription(
        &self,
        organization_id: i64,
        subscription: &LicenseSubscription,
    ) -> Result<(), IoTBeeError> {
        sqlx::query(
            r#"
            INSERT INTO license_subscriptions (
                organization_id, license_key, plan, state, activated_at, expires_at, last_checked_at, updated_at,
                stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
                stripe_subscription_status, stripe_payment_status, current_period_end,
                cancel_at_period_end, latest_invoice_id, amount_cents, currency
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT(organization_id) DO UPDATE SET
                license_key = excluded.license_key,
                plan = excluded.plan,
                state = excluded.state,
                activated_at = excluded.activated_at,
                expires_at = excluded.expires_at,
                last_checked_at = excluded.last_checked_at,
                stripe_customer_id = excluded.stripe_customer_id,
                stripe_subscription_id = excluded.stripe_subscription_id,
                stripe_checkout_session_id = excluded.stripe_checkout_session_id,
                stripe_subscription_status = excluded.stripe_subscription_status,
                stripe_payment_status = excluded.stripe_payment_status,
                current_period_end = excluded.current_period_end,
                cancel_at_period_end = excluded.cancel_at_period_end,
                latest_invoice_id = excluded.latest_invoice_id,
                amount_cents = excluded.amount_cents,
                currency = excluded.currency,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(organization_id)
        .bind(subscription.license_key())
        .bind(subscription.plan().as_str())
        .bind(subscription.state().as_str())
        .bind(subscription.activated_at().to_rfc3339())
        .bind(subscription.expires_at().map(|dt| dt.to_rfc3339()))
        .bind(subscription.last_checked_at().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .bind(subscription.stripe_customer_id())
        .bind(subscription.stripe_subscription_id())
        .bind(subscription.stripe_checkout_session_id())
        .bind(subscription.stripe_subscription_status())
        .bind(subscription.stripe_payment_status())
        .bind(subscription.current_period_end().map(|dt| dt.to_rfc3339()))
        .bind(subscription.cancel_at_period_end())
        .bind(subscription.latest_invoice_id())
        .bind(subscription.amount_cents())
        .bind(subscription.currency())
        .execute(self.pool())
        .await
        .map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;

        Ok(())
    }

    async fn deactivate_subscription(&self, organization_id: i64) -> Result<(), IoTBeeError> {
        sqlx::query(
            r#"
            UPDATE license_subscriptions
            SET state = 'inactive', updated_at = $1, last_checked_at = $2
            WHERE organization_id = $3
            "#,
        )
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .bind(organization_id)
        .execute(self.pool())
        .await
        .map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;

        Ok(())
    }

    async fn sync_stripe_subscription(
        &self,
        organization_id: i64,
        sync: &StripeBillingSync,
    ) -> Result<LicenseSubscription, IoTBeeError> {
        let now = Utc::now();
        let subscription = LicenseSubscription::new(
            sync.license_key.clone(),
            sync.plan,
            sync.state,
            now,
            sync.current_period_end,
            now,
        )
        .with_stripe_billing(
            sync.stripe_customer_id.clone(),
            sync.stripe_subscription_id.clone(),
            sync.stripe_checkout_session_id.clone(),
            sync.stripe_subscription_status.clone(),
            sync.stripe_payment_status.clone(),
            sync.current_period_end,
            sync.cancel_at_period_end,
            sync.latest_invoice_id.clone(),
            sync.amount_cents,
            sync.currency.clone(),
        );

        let mut tx = self
            .pool()
            .begin()
            .await
            .map_err(|e| LicenseError::Persistence {
                reason: e.to_string(),
            })?;

        if let (Some(event_id), Some(event_type)) =
            (sync.stripe_event_id.as_ref(), sync.event_type.as_ref())
        {
            sqlx::query(
                r#"
                INSERT INTO billing_events (organization_id, stripe_event_id, event_type, payload)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (stripe_event_id) DO NOTHING
                "#,
            )
            .bind(organization_id)
            .bind(event_id)
            .bind(event_type)
            .bind(billing_event_payload(sync))
            .execute(&mut *tx)
            .await
            .map_err(|e| LicenseError::Persistence {
                reason: e.to_string(),
            })?;
        }

        sqlx::query(
            r#"
            INSERT INTO license_subscriptions (
                organization_id, license_key, plan, state, activated_at, expires_at, last_checked_at, updated_at,
                stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
                stripe_subscription_status, stripe_payment_status, current_period_end,
                cancel_at_period_end, latest_invoice_id, amount_cents, currency
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT(organization_id) DO UPDATE SET
                license_key = excluded.license_key,
                plan = excluded.plan,
                state = excluded.state,
                expires_at = excluded.expires_at,
                last_checked_at = excluded.last_checked_at,
                stripe_customer_id = excluded.stripe_customer_id,
                stripe_subscription_id = excluded.stripe_subscription_id,
                stripe_checkout_session_id = excluded.stripe_checkout_session_id,
                stripe_subscription_status = excluded.stripe_subscription_status,
                stripe_payment_status = excluded.stripe_payment_status,
                current_period_end = excluded.current_period_end,
                cancel_at_period_end = excluded.cancel_at_period_end,
                latest_invoice_id = excluded.latest_invoice_id,
                amount_cents = excluded.amount_cents,
                currency = excluded.currency,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(organization_id)
        .bind(subscription.license_key())
        .bind(subscription.plan().as_str())
        .bind(subscription.state().as_str())
        .bind(subscription.activated_at().to_rfc3339())
        .bind(subscription.expires_at().map(|dt| dt.to_rfc3339()))
        .bind(subscription.last_checked_at().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .bind(subscription.stripe_customer_id())
        .bind(subscription.stripe_subscription_id())
        .bind(subscription.stripe_checkout_session_id())
        .bind(subscription.stripe_subscription_status())
        .bind(subscription.stripe_payment_status())
        .bind(subscription.current_period_end().map(|dt| dt.to_rfc3339()))
        .bind(subscription.cancel_at_period_end())
        .bind(subscription.latest_invoice_id())
        .bind(subscription.amount_cents())
        .bind(subscription.currency())
        .execute(&mut *tx)
        .await
        .map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;

        tx.commit().await.map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;

        Ok(subscription)
    }

    async fn list_billing_events(
        &self,
        organization_id: i64,
        limit: i64,
    ) -> Result<Vec<BillingEvent>, IoTBeeError> {
        let limit = limit.clamp(1, 500);
        let rows: Vec<(i64, i64, String, String, String, String, bool, Option<String>)> = sqlx::query_as(
            "SELECT id, organization_id, stripe_event_id, event_type, payload, created_at, processed_ok, last_error \
                 FROM billing_events WHERE organization_id = $1 ORDER BY id DESC LIMIT $2",
        )
        .bind(organization_id)
        .bind(limit)
        .fetch_all(self.pool())
        .await
        .map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;
        Ok(rows
            .into_iter()
            .map(
                |(id, organization_id, ev, ty, pl, ca, ok, err)| BillingEvent {
                    id,
                    organization_id,
                    stripe_event_id: ev,
                    event_type: ty,
                    payload: pl,
                    created_at: parse_billing_dt(&ca),
                    processed_ok: ok,
                    last_error: err,
                },
            )
            .collect())
    }

    async fn list_billing_events_page(
        &self,
        organization_id: i64,
        cursor: Option<i64>,
        limit: i64,
    ) -> Result<(Vec<BillingEvent>, Option<i64>), IoTBeeError> {
        let limit = limit.clamp(1, 200);
        type BillingEventRow = (
            i64,
            i64,
            String,
            String,
            String,
            String,
            bool,
            Option<String>,
        );
        let mut rows: Vec<BillingEventRow> = if let Some(cursor) = cursor {
            sqlx::query_as(
                "SELECT id, organization_id, stripe_event_id, event_type, payload, created_at, processed_ok, last_error \
                 FROM billing_events WHERE organization_id = $1 AND id < $2 ORDER BY id DESC LIMIT $3",
            )
            .bind(organization_id)
            .bind(cursor)
            .bind(limit + 1)
            .fetch_all(self.pool())
            .await
        } else {
            sqlx::query_as(
                "SELECT id, organization_id, stripe_event_id, event_type, payload, created_at, processed_ok, last_error \
                 FROM billing_events WHERE organization_id = $1 ORDER BY id DESC LIMIT $2",
            )
            .bind(organization_id)
            .bind(limit + 1)
            .fetch_all(self.pool())
            .await
        }
        .map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;
        let has_next_page = rows.len() > limit as usize;
        rows.truncate(limit as usize);
        let events = rows
            .into_iter()
            .map(
                |(id, organization_id, ev, ty, pl, ca, ok, err)| BillingEvent {
                    id,
                    organization_id,
                    stripe_event_id: ev,
                    event_type: ty,
                    payload: pl,
                    created_at: parse_billing_dt(&ca),
                    processed_ok: ok,
                    last_error: err,
                },
            )
            .collect::<Vec<_>>();
        let next_cursor = has_next_page
            .then(|| events.last().map(|event| event.id))
            .flatten();
        Ok((events, next_cursor))
    }

    async fn get_billing_event(
        &self,
        organization_id: i64,
        id: i64,
    ) -> Result<Option<BillingEvent>, IoTBeeError> {
        let row: Option<(i64, i64, String, String, String, String, bool, Option<String>)> =
            sqlx::query_as(
                "SELECT id, organization_id, stripe_event_id, event_type, payload, created_at, processed_ok, last_error \
                 FROM billing_events WHERE id = $1 AND organization_id = $2",
            )
            .bind(id)
            .bind(organization_id)
            .fetch_optional(self.pool())
            .await
            .map_err(|e| LicenseError::Persistence {
                reason: e.to_string(),
            })?;
        Ok(row.map(
            |(id, organization_id, ev, ty, pl, ca, ok, err)| BillingEvent {
                id,
                organization_id,
                stripe_event_id: ev,
                event_type: ty,
                payload: pl,
                created_at: parse_billing_dt(&ca),
                processed_ok: ok,
                last_error: err,
            },
        ))
    }

    async fn mark_billing_event_processed(
        &self,
        organization_id: i64,
        id: i64,
        ok: bool,
        error: Option<&str>,
    ) -> Result<(), IoTBeeError> {
        sqlx::query(
            "UPDATE billing_events SET processed_ok = $1, last_error = $2 WHERE id = $3 AND organization_id = $4",
        )
        .bind(ok)
        .bind(error)
        .bind(id)
        .bind(organization_id)
            .execute(self.pool())
            .await
            .map_err(|e| LicenseError::Persistence {
                reason: e.to_string(),
            })?;
        Ok(())
    }
}

fn parse_billing_dt(raw: &str) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(raw)
        .map(|dt| dt.with_timezone(&Utc))
        .or_else(|_| NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S").map(|n| n.and_utc()))
        .unwrap_or_else(|_| Utc::now())
}
