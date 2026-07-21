use std::sync::OnceLock;

use actix_web::{HttpResponse, Scope, get, web};
use application::pipeline_lifecycle_cases::cases::PipelineLifecycleCases;
use domain::value_objects::lifecycle_values::PipelineStatus;
use prometheus::{
    Encoder, GaugeVec, Registry, TextEncoder, opts, register_gauge_vec_with_registry,
};

type UseCase = dyn PipelineLifecycleCases + Send + Sync;

const PROMETHEUS_CONTENT_TYPE: &str = "text/plain; version=0.0.4";

struct Metrics {
    registry: Registry,
    build_info: GaugeVec,
    pipeline_status: GaugeVec,
}

fn metrics() -> &'static Metrics {
    static METRICS: OnceLock<Metrics> = OnceLock::new();
    METRICS.get_or_init(|| {
        let registry = Registry::new();

        let build_info = register_gauge_vec_with_registry!(
            opts!(
                "iot_bee_build_info",
                "Build metadata for the running iot bees binary"
            ),
            &["version", "commit"],
            registry
        )
        .expect("register iot_bee_build_info");

        let pipeline_status = register_gauge_vec_with_registry!(
            opts!(
                "iot_bee_pipeline_status",
                "Current pipeline status (0=stopped/idle, 1=running/healthy, 2=degraded)"
            ),
            &["pipeline_id", "name"],
            registry
        )
        .expect("register iot_bee_pipeline_status");

        let version = env!("CARGO_PKG_VERSION");
        let commit = option_env!("GIT_SHA").unwrap_or("unknown");
        build_info.with_label_values(&[version, commit]).set(1.0);

        Metrics {
            registry,
            build_info,
            pipeline_status,
        }
    })
}

pub fn metrics_scope() -> Scope {
    web::scope("/metrics").service(render)
}

#[utoipa::path(
    get,
    path = "/metrics",
    responses(
        (status = 200, description = "Prometheus text exposition", content_type = "text/plain")
    ),
    tag = "Observability"
)]
#[get("")]
async fn render(use_case: Option<web::Data<UseCase>>) -> HttpResponse {
    let m = metrics();

    m.pipeline_status.reset();
    if let Some(uc) = use_case.as_ref() {
        if let Ok(reports) = uc.get_all_pipeline_status_for_system().await {
            for report in reports {
                let value = match report.overall_status() {
                    PipelineStatus::Idle => 0.0,
                    PipelineStatus::Healthy => 1.0,
                    PipelineStatus::Degraded => 2.0,
                };
                let pid = report.pipeline_id().to_string();
                m.pipeline_status
                    .with_label_values(&[pid.as_str(), report.pipeline_name()])
                    .set(value);
            }
        }
    }

    // Re-stamp build_info each scrape (idempotent: same label set).
    let version = env!("CARGO_PKG_VERSION");
    let commit = option_env!("GIT_SHA").unwrap_or("unknown");
    m.build_info.with_label_values(&[version, commit]).set(1.0);

    let mut buffer = Vec::new();
    let encoder = TextEncoder::new();
    if encoder.encode(&m.registry.gather(), &mut buffer).is_err() {
        return HttpResponse::InternalServerError().finish();
    }

    HttpResponse::Ok()
        .content_type(PROMETHEUS_CONTENT_TYPE)
        .body(buffer)
}
