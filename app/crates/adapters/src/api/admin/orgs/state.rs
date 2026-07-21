use actix_web::{HttpRequest, HttpResponse, Scope, get, web};
use serde::Serialize;
use utoipa::ToSchema;

use application::license_cases::cases::LicenseUseCases;
use application::pipeline_data_cases::cases::PipelineDataUseCases;
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::error::IoTBeeError;
use domain::organization::inbound::organization_uses::OrganizationUseCases;

use crate::api::admin::audit::models::AuditEventResponse;
use crate::api::admin::organization::models::OrganizationResponse;
use crate::api::error::{ApiError, ErrorResponse};
use crate::api::license::models::LicenseStatusResponse;
use crate::api::utils::require_org_id;

pub struct OrgStateDeps {
    pub orgs: web::Data<dyn OrganizationUseCases + Send + Sync>,
    pub license: web::Data<dyn LicenseUseCases + Send + Sync>,
    pub pipelines: web::Data<dyn PipelineDataUseCases + Send + Sync>,
    pub audit: web::Data<dyn AuditUseCases + Send + Sync>,
}

pub fn orgs_scope(deps: OrgStateDeps) -> Scope {
    web::scope("/orgs")
        .app_data(deps.orgs)
        .app_data(deps.license)
        .app_data(deps.pipelines)
        .app_data(deps.audit)
        .service(get_state)
}

#[derive(Serialize, ToSchema)]
pub struct PipelineStateRow {
    pub id: u32,
    pub name: String,
    pub status: String,
}

#[derive(Serialize, ToSchema)]
pub struct OrgStateResponse {
    pub org: OrganizationResponse,
    pub license: LicenseStatusResponse,
    pub pipelines: Vec<PipelineStateRow>,
    #[serde(rename = "recentAudit")]
    pub recent_audit: Vec<AuditEventResponse>,
}

#[utoipa::path(
    get,
    path = "/admin/orgs/{id}/state",
    responses(
        (status = 200, description = "Aggregated org state", body = OrgStateResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Org not found", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("/{id}/state")]
pub async fn get_state(
    req: HttpRequest,
    path: web::Path<i64>,
    orgs: web::Data<dyn OrganizationUseCases + Send + Sync>,
    license: web::Data<dyn LicenseUseCases + Send + Sync>,
    pipelines: web::Data<dyn PipelineDataUseCases + Send + Sync>,
    audit: web::Data<dyn AuditUseCases + Send + Sync>,
) -> Result<HttpResponse, ApiError> {
    let id = path.into_inner();
    if id != require_org_id(&req)? {
        return Err(ApiError(IoTBeeError::AuthError(
            domain::error::AuthError::Forbidden,
        )));
    }
    let org = orgs
        .read(id)
        .await
        .map_err(|e| ApiError(IoTBeeError::OrganizationError(e)))?;
    let pipelines_list = pipelines.get_pipeline(id).await?;
    let pipeline_rows: Vec<PipelineStateRow> = pipelines_list
        .iter()
        .map(|p| PipelineStateRow {
            id: p.id().id(),
            name: p.name().to_string(),
            status: if p.is_active() {
                "active".to_string()
            } else {
                "inactive".to_string()
            },
        })
        .collect();
    let license_status = license.status(id, pipeline_rows.len() as u32).await?;
    let recent = audit
        .list_recent_for(id, 20)
        .await
        .map_err(|e| ApiError(IoTBeeError::AuditError(e)))?;

    let resp = OrgStateResponse {
        org: OrganizationResponse {
            id: org.id,
            name: org.name,
            slug: org.slug,
            created_at: org.created_at.to_rfc3339(),
            updated_at: org.updated_at.to_rfc3339(),
        },
        license: LicenseStatusResponse::from(license_status),
        pipelines: pipeline_rows,
        recent_audit: recent
            .into_iter()
            .map(|e| AuditEventResponse {
                id: e.id,
                organization_id: e.organization_id,
                user_id: e.user_id,
                user_email: e.user_email,
                user_role: e.user_role,
                action: e.action,
                method: e.method,
                path: e.path,
                status_code: e.status_code,
                ip_address: e.ip_address,
                created_at: e.created_at.to_rfc3339(),
            })
            .collect(),
    };
    Ok(HttpResponse::Ok().json(resp))
}
