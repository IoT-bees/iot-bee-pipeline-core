use async_trait::async_trait;
use chrono::{DateTime, Utc};
use domain::error::{IoTBeeError, LicenseError};
use domain::usage::entities::{UsageCounters, UsageEvent, UsageScope};
use domain::usage::outbound::UsageRepository;
use std::sync::Arc;

use crate::persistence::connection::InternalDataBase;
use crate::persistence::ids::pipeline_id_to_database;

pub struct PostgresUsageRepository {
    database: Arc<InternalDataBase>,
}

impl PostgresUsageRepository {
    pub fn new(database: Arc<InternalDataBase>) -> Self {
        Self { database }
    }

    /// Las reservas representan mensajes en vuelo del proceso actual. Tras un
    /// reinicio no existe trabajo en vuelo que pueda completarlas, por lo que
    /// se liberan antes de arrancar consumidores.
    pub async fn clear_reservations_after_restart(&self) -> Result<(), IoTBeeError> {
        sqlx::query("UPDATE usage_monthly_quota SET reserved_messages = 0")
            .execute(self.database.pool())
            .await
            .map_err(|error| LicenseError::Persistence {
                reason: error.to_string(),
            })?;
        Ok(())
    }
}

fn bucket_day(at: DateTime<Utc>) -> String {
    at.format("%Y-%m-%d").to_string()
}

fn bucket_month(at: DateTime<Utc>) -> String {
    at.format("%Y-%m-01T00:00:00Z").to_string()
}

fn delta(event: UsageEvent) -> UsageCounters {
    match event {
        UsageEvent::Received { bytes } => UsageCounters {
            messages_received: 1,
            bytes_in: bytes,
            ..Default::default()
        },
        UsageEvent::Validated => UsageCounters {
            messages_validated: 1,
            ..Default::default()
        },
        UsageEvent::Invalid | UsageEvent::Failed | UsageEvent::QuotaBlocked => UsageCounters {
            messages_failed: 1,
            ..Default::default()
        },
        UsageEvent::Delivered { bytes_out } => UsageCounters {
            messages_delivered: 1,
            bytes_out,
            ..Default::default()
        },
    }
}

#[async_trait]
impl UsageRepository for PostgresUsageRepository {
    async fn reserve_processing_slot(
        &self,
        organization_id: i64,
        at: DateTime<Utc>,
        included_messages: u64,
    ) -> Result<bool, IoTBeeError> {
        let month = bucket_month(at);
        let mut tx =
            self.database
                .pool()
                .begin()
                .await
                .map_err(|error| LicenseError::Persistence {
                    reason: error.to_string(),
                })?;
        sqlx::query(
            "INSERT INTO usage_monthly_quota (organization_id, bucket_month) VALUES ($1, $2) \
             ON CONFLICT (organization_id, bucket_month) DO NOTHING",
        )
        .bind(organization_id)
        .bind(&month)
        .execute(&mut *tx)
        .await
        .map_err(|error| LicenseError::Persistence {
            reason: error.to_string(),
        })?;
        let updated = sqlx::query(
            "UPDATE usage_monthly_quota SET reserved_messages = reserved_messages + 1 \
             WHERE organization_id = $1 AND bucket_month = $2 AND reserved_messages + \
             COALESCE((SELECT SUM(messages_delivered) FROM usage_monthly WHERE organization_id = $3 AND bucket_month = $4), 0) < $5",
        )
        .bind(organization_id).bind(&month).bind(organization_id).bind(&month).bind(included_messages as i64)
        .execute(&mut *tx).await
        .map_err(|error| LicenseError::Persistence { reason: error.to_string() })?;
        tx.commit()
            .await
            .map_err(|error| LicenseError::Persistence {
                reason: error.to_string(),
            })?;
        Ok(updated.rows_affected() == 1)
    }

    async fn release_processing_slot(
        &self,
        organization_id: i64,
        at: DateTime<Utc>,
    ) -> Result<(), IoTBeeError> {
        sqlx::query(
            "UPDATE usage_monthly_quota SET reserved_messages = GREATEST(reserved_messages - 1, 0) \
             WHERE organization_id = $1 AND bucket_month = $2",
        )
        .bind(organization_id)
        .bind(bucket_month(at))
        .execute(self.database.pool())
        .await
        .map_err(|error| LicenseError::Persistence {
            reason: error.to_string(),
        })?;
        Ok(())
    }

    async fn record(
        &self,
        scope: UsageScope,
        at: DateTime<Utc>,
        event: UsageEvent,
    ) -> Result<(), IoTBeeError> {
        let delta = delta(event);
        let mut tx =
            self.database
                .pool()
                .begin()
                .await
                .map_err(|error| LicenseError::Persistence {
                    reason: error.to_string(),
                })?;
        for (table, bucket) in [
            ("usage_daily", bucket_day(at)),
            ("usage_monthly", bucket_month(at)),
        ] {
            let sql = format!(
                "INSERT INTO {table} (organization_id, pipeline_id, {bucket_column}, messages_received, messages_validated, messages_delivered, messages_failed, bytes_in, bytes_out) \
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) \
                 ON CONFLICT(organization_id, pipeline_id, {bucket_column}) DO UPDATE SET \
                 messages_received = {table}.messages_received + excluded.messages_received, \
                 messages_validated = {table}.messages_validated + excluded.messages_validated, \
                 messages_delivered = {table}.messages_delivered + excluded.messages_delivered, \
                 messages_failed = {table}.messages_failed + excluded.messages_failed, \
                 bytes_in = {table}.bytes_in + excluded.bytes_in, bytes_out = {table}.bytes_out + excluded.bytes_out",
                bucket_column = if table == "usage_daily" {
                    "bucket_day"
                } else {
                    "bucket_month"
                },
            );
            sqlx::query(&sql)
                .bind(scope.organization_id)
                .bind(pipeline_id_to_database(scope.pipeline_id))
                .bind(bucket)
                .bind(delta.messages_received as i64)
                .bind(delta.messages_validated as i64)
                .bind(delta.messages_delivered as i64)
                .bind(delta.messages_failed as i64)
                .bind(delta.bytes_in as i64)
                .bind(delta.bytes_out as i64)
                .execute(&mut *tx)
                .await
                .map_err(|error| LicenseError::Persistence {
                    reason: error.to_string(),
                })?;
        }
        tx.commit()
            .await
            .map_err(|error| LicenseError::Persistence {
                reason: error.to_string(),
            })?;
        Ok(())
    }

    async fn current_month(
        &self,
        organization_id: i64,
        at: DateTime<Utc>,
    ) -> Result<UsageCounters, IoTBeeError> {
        let row: (i64, i64, i64, i64, i64, i64) = sqlx::query_as(
            "SELECT COALESCE(SUM(messages_received), 0)::BIGINT, COALESCE(SUM(messages_validated), 0)::BIGINT, \
             COALESCE(SUM(messages_delivered), 0)::BIGINT, COALESCE(SUM(messages_failed), 0)::BIGINT, \
             COALESCE(SUM(bytes_in), 0)::BIGINT, COALESCE(SUM(bytes_out), 0)::BIGINT \
             FROM usage_monthly WHERE organization_id = $1 AND bucket_month = $2",
        )
        .bind(organization_id)
        .bind(bucket_month(at))
        .fetch_one(self.database.pool())
        .await
        .map_err(|error| LicenseError::Persistence {
            reason: error.to_string(),
        })?;
        Ok(UsageCounters {
            messages_received: row.0 as u64,
            messages_validated: row.1 as u64,
            messages_delivered: row.2 as u64,
            messages_failed: row.3 as u64,
            bytes_in: row.4 as u64,
            bytes_out: row.5 as u64,
        })
    }

    async fn current_month_by_pipeline(
        &self,
        organization_id: i64,
        at: DateTime<Utc>,
    ) -> Result<Vec<(u32, UsageCounters)>, IoTBeeError> {
        let rows: Vec<(i64, i64, i64, i64, i64, i64, i64)> = sqlx::query_as(
            "SELECT pipeline_id, messages_received, messages_validated, messages_delivered, \
             messages_failed, bytes_in, bytes_out FROM usage_monthly \
             WHERE organization_id = $1 AND bucket_month = $2 ORDER BY pipeline_id",
        )
        .bind(organization_id)
        .bind(bucket_month(at))
        .fetch_all(self.database.pool())
        .await
        .map_err(|error| LicenseError::Persistence {
            reason: error.to_string(),
        })?;
        Ok(rows
            .into_iter()
            .map(|row| {
                (
                    row.0 as u32,
                    UsageCounters {
                        messages_received: row.1 as u64,
                        messages_validated: row.2 as u64,
                        messages_delivered: row.3 as u64,
                        messages_failed: row.4 as u64,
                        bytes_in: row.5 as u64,
                        bytes_out: row.6 as u64,
                    },
                )
            })
            .collect())
    }

    async fn claim_notification(
        &self,
        organization_id: i64,
        cycle_start: DateTime<Utc>,
        threshold: u8,
    ) -> Result<bool, IoTBeeError> {
        let result = sqlx::query(
            "INSERT INTO usage_quota_notifications (organization_id, bucket_month, threshold) VALUES ($1, $2, $3) \
             ON CONFLICT (organization_id, bucket_month, threshold) DO NOTHING",
        )
        .bind(organization_id)
        .bind(bucket_month(cycle_start))
        .bind(i64::from(threshold))
        .execute(self.database.pool())
        .await
        .map_err(|error| LicenseError::Persistence { reason: error.to_string() })?;
        Ok(result.rows_affected() == 1)
    }
}
