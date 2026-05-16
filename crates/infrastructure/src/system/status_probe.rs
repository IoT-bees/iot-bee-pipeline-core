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
            sqlx::query_scalar::<_, i64>("SELECT 1").fetch_one(self.db.pool()),
        )
        .await;
        match res {
            Ok(Ok(_)) => Dependency {
                name: "sqlite".into(),
                ok: true,
                latency_ms: Some(start.elapsed().as_millis() as u64),
                error: None,
            },
            Ok(Err(e)) => Dependency {
                name: "sqlite".into(),
                ok: false,
                latency_ms: None,
                error: Some(e.to_string()),
            },
            Err(_) => Dependency {
                name: "sqlite".into(),
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
                    ok: true,
                    latency_ms: Some(start.elapsed().as_millis() as u64),
                    error: None,
                }
            }
            Ok(Err(e)) => Dependency {
                name: "rabbitmq".into(),
                ok: false,
                latency_ms: None,
                error: Some(e.to_string()),
            },
            Err(_) => Dependency {
                name: "rabbitmq".into(),
                ok: false,
                latency_ms: None,
                error: Some("timeout".into()),
            },
        }
    }

    async fn pipeline_count(&self) -> i64 {
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pipelines")
            .fetch_one(self.db.pool())
            .await
            .unwrap_or(0)
    }
}

#[async_trait]
impl SystemStatusProbe for SystemStatusProbeImpl {
    async fn probe(&self) -> Result<SystemStatus, SystemError> {
        let (db_dep, mq_dep, count) =
            tokio::join!(self.probe_db(), self.probe_rabbit(), self.pipeline_count());

        Ok(SystemStatus {
            probed_at: Utc::now(),
            dependencies: vec![db_dep, mq_dep],
            runtime: RuntimeSummary {
                configured_pipelines: count,
                live_replicas: None,
                msgs_last_hour: None,
            },
            build: BuildInfo {
                commit: option_env!("BUILD_COMMIT").unwrap_or("dev").to_string(),
                build_time: option_env!("BUILD_TIME").unwrap_or("unknown").to_string(),
                uptime_seconds: self.process_start.elapsed().as_secs(),
            },
        })
    }
}
