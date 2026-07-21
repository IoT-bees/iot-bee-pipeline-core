use actix_web::{HttpRequest, HttpResponse, get, web};
use application::usage_cases::cases::UsageUseCases;
use domain::usage::entities::{UsageQuotaState, UsageView};
use serde::Serialize;

use crate::api::error::ApiError;
use crate::api::utils::{require_admin, require_org_id};

type UseCase = dyn UsageUseCases + Send + Sync;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UsageResponse {
    organization_id: i64,
    pipeline_id: Option<u32>,
    cycle_start: String,
    cycle_end: String,
    included_messages: u64,
    consumed_messages: u64,
    percentage: u64,
    quota_state: &'static str,
    messages_received: u64,
    messages_validated: u64,
    messages_delivered: u64,
    messages_failed: u64,
    bytes_in: u64,
    bytes_out: u64,
}

impl From<UsageView> for UsageResponse {
    fn from(value: UsageView) -> Self {
        let percentage = if value.included_messages == 0 {
            100
        } else {
            value.counters.messages_delivered.saturating_mul(100) / value.included_messages
        };
        Self {
            organization_id: value.organization_id,
            pipeline_id: value.pipeline_id,
            cycle_start: value.cycle_start.to_rfc3339(),
            cycle_end: value.cycle_end.to_rfc3339(),
            included_messages: value.included_messages,
            consumed_messages: value.counters.messages_delivered,
            percentage,
            quota_state: match value.quota_state {
                UsageQuotaState::Available => "available",
                UsageQuotaState::Warning => "warning",
                UsageQuotaState::Exhausted => "exhausted",
            },
            messages_received: value.counters.messages_received,
            messages_validated: value.counters.messages_validated,
            messages_delivered: value.counters.messages_delivered,
            messages_failed: value.counters.messages_failed,
            bytes_in: value.counters.bytes_in,
            bytes_out: value.counters.bytes_out,
        }
    }
}

pub fn usage_scope(uc: web::Data<UseCase>) -> actix_web::Scope {
    web::scope("/usage")
        .app_data(uc)
        .service(current)
        .service(pipelines)
}

#[get("")]
async fn current(req: HttpRequest, uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let usage = uc.current(require_org_id(&req)?).await?;
    Ok(HttpResponse::Ok().json(UsageResponse::from(usage)))
}

#[get("/pipelines")]
async fn pipelines(req: HttpRequest, uc: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    require_admin(&req)?;
    let usage = uc.by_pipeline(require_org_id(&req)?).await?;
    Ok(HttpResponse::Ok().json(
        usage
            .into_iter()
            .map(UsageResponse::from)
            .collect::<Vec<_>>(),
    ))
}
