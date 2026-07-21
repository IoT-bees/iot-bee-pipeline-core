use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use chrono::Utc;
use tokio::time::timeout;

use domain::error::SystemError;
use domain::system::entities::system_status::{
    BuildInfo, Dependency, RuntimeSummary, SystemStatus,
};
use domain::system::outbound::system_status_probe::SystemStatusProbe;

use crate::persistence::connection::InternalDataBase;

pub struct SystemStatusProbeImpl {
    db: Arc<InternalDataBase>,
    process_start: Instant,
    rabbitmq_url: Option<String>,
}

impl SystemStatusProbeImpl {
    pub fn new(
        db: Arc<InternalDataBase>,
        process_start: Instant,
        rabbitmq_url: Option<String>,
    ) -> Self {
        Self {
            db,
            process_start,
            rabbitmq_url,
        }
    }

    async fn probe_db(&self) -> Dependency {
        let start = Instant::now();
        let res = timeout(
            Duration::from_millis(300),
            sqlx::query_scalar::<_, i32>("SELECT 1").fetch_one(self.db.pool()),
        )
        .await;
        match res {
            Ok(Ok(_)) => Dependency {
                name: "postgres".into(),
                configured: true,
                ok: true,
                latency_ms: Some(start.elapsed().as_millis() as u64),
                error: None,
            },
            Ok(Err(e)) => Dependency {
                name: "postgres".into(),
                configured: true,
                ok: false,
                latency_ms: None,
                error: Some(e.to_string()),
            },
            Err(_) => Dependency {
                name: "postgres".into(),
                configured: true,
                ok: false,
                latency_ms: None,
                error: Some("timeout".into()),
            },
        }
    }

    async fn probe_rabbit(&self) -> Dependency {
        let Some(url) = self.rabbitmq_url.clone() else {
            return Dependency {
                name: "rabbitmq".into(),
                configured: false,
                ok: false,
                latency_ms: None,
                error: Some("RABBITMQ_URL not configured".into()),
            };
        };
        let start = Instant::now();
        let connect = lapin::Connection::connect(&url, lapin::ConnectionProperties::default());
        match timeout(Duration::from_millis(300), connect).await {
            Ok(Ok(conn)) => {
                let _ = conn.close(0, "probe done".into()).await;
                Dependency {
                    name: "rabbitmq".into(),
                    configured: true,
                    ok: true,
                    latency_ms: Some(start.elapsed().as_millis() as u64),
                    error: None,
                }
            }
            Ok(Err(e)) => Dependency {
                name: "rabbitmq".into(),
                configured: true,
                ok: false,
                latency_ms: None,
                error: Some(e.to_string()),
            },
            Err(_) => Dependency {
                name: "rabbitmq".into(),
                configured: true,
                ok: false,
                latency_ms: None,
                error: Some("timeout".into()),
            },
        }
    }

    async fn runtime_summary(&self) -> RuntimeSummary {
        let today = Utc::now().format("%Y-%m-%d").to_string();
        let configured_pipelines =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*)::BIGINT FROM pipelines")
                .fetch_one(self.db.pool());
        let configured_replicas = sqlx::query_scalar::<_, i64>(
            "SELECT COALESCE(SUM(replicas), 0)::BIGINT FROM pipelines",
        )
        .fetch_one(self.db.pool());
        let messages_received_today = sqlx::query_scalar::<_, i64>(
            "SELECT COALESCE(SUM(messages_received), 0)::BIGINT FROM usage_daily WHERE bucket_day = $1",
        )
        .bind(today)
        .fetch_one(self.db.pool());

        let (configured_pipelines, configured_replicas, messages_received_today) = tokio::join!(
            configured_pipelines,
            configured_replicas,
            messages_received_today,
        );

        RuntimeSummary {
            configured_pipelines: configured_pipelines.unwrap_or(0),
            live_replicas: Some(configured_replicas.unwrap_or(0)),
            msgs_last_hour: Some(messages_received_today.unwrap_or(0)),
        }
    }
}

#[async_trait]
impl SystemStatusProbe for SystemStatusProbeImpl {
    async fn probe(&self) -> Result<SystemStatus, SystemError> {
        let (db_dep, mq_dep, runtime) =
            tokio::join!(self.probe_db(), self.probe_rabbit(), self.runtime_summary(),);

        Ok(SystemStatus {
            probed_at: Utc::now(),
            dependencies: vec![db_dep, mq_dep],
            runtime,
            build: BuildInfo {
                commit: option_env!("BUILD_COMMIT").unwrap_or("dev").to_string(),
                build_time: option_env!("BUILD_TIME").unwrap_or("unknown").to_string(),
                uptime_seconds: self.process_start.elapsed().as_secs(),
            },
        })
    }
}
