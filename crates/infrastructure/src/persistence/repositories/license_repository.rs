use crate::persistence::connection::InternalDataBase;
use crate::persistence::models::LicenseSubscriptionRow;
use async_trait::async_trait;
use chrono::Utc;
use domain::entities::license::{LicenseSubscription, StripeBillingSync};
use domain::error::{IoTBeeError, LicenseError};
use domain::outbound::license_repository::LicenseRepository;
use std::sync::Arc;

pub struct SqliteLicenseRepository {
    database: Arc<InternalDataBase>,
}

impl SqliteLicenseRepository {
    pub fn new(database: Arc<InternalDataBase>) -> Self {
        Self { database }
    }

    fn pool(&self) -> &sqlx::SqlitePool {
        self.database.pool()
    }
}

#[async_trait]
impl LicenseRepository for SqliteLicenseRepository {
    async fn get_subscription(&self) -> Result<Option<LicenseSubscription>, IoTBeeError> {
        let row = sqlx::query_as::<_, LicenseSubscriptionRow>(
            r#"
            SELECT license_key, plan, state, activated_at, expires_at, last_checked_at
                , stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id
                , stripe_subscription_status, stripe_payment_status, current_period_end
                , cancel_at_period_end, latest_invoice_id, amount_cents, currency
            FROM license_subscriptions
            WHERE id = 1
            "#,
        )
        .fetch_optional(self.pool())
        .await
        .map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;

        row.map(TryInto::try_into).transpose()
    }

    async fn upsert_subscription(
        &self,
        subscription: &LicenseSubscription,
    ) -> Result<(), IoTBeeError> {
        sqlx::query(
            r#"
            INSERT INTO license_subscriptions (
                id, license_key, plan, state, activated_at, expires_at, last_checked_at, updated_at,
                stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
                stripe_subscription_status, stripe_payment_status, current_period_end,
                cancel_at_period_end, latest_invoice_id, amount_cents, currency
            )
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
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

    async fn deactivate_subscription(&self) -> Result<(), IoTBeeError> {
        sqlx::query(
            r#"
            UPDATE license_subscriptions
            SET state = 'inactive', updated_at = ?, last_checked_at = ?
            WHERE id = 1
            "#,
        )
        .bind(Utc::now().to_rfc3339())
        .bind(Utc::now().to_rfc3339())
        .execute(self.pool())
        .await
        .map_err(|e| LicenseError::Persistence {
            reason: e.to_string(),
        })?;

        Ok(())
    }

    async fn sync_stripe_subscription(
        &self,
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

        if let (Some(event_id), Some(event_type), Some(payload)) = (
            sync.stripe_event_id.as_ref(),
            sync.event_type.as_ref(),
            sync.event_payload.as_ref(),
        ) {
            sqlx::query(
                r#"
                INSERT OR IGNORE INTO billing_events (stripe_event_id, event_type, payload)
                VALUES (?, ?, ?)
                "#,
            )
            .bind(event_id)
            .bind(event_type)
            .bind(payload)
            .execute(&mut *tx)
            .await
            .map_err(|e| LicenseError::Persistence {
                reason: e.to_string(),
            })?;
        }

        sqlx::query(
            r#"
            INSERT INTO license_subscriptions (
                id, license_key, plan, state, activated_at, expires_at, last_checked_at, updated_at,
                stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,
                stripe_subscription_status, stripe_payment_status, current_period_end,
                cancel_at_period_end, latest_invoice_id, amount_cents, currency
            )
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
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
}
