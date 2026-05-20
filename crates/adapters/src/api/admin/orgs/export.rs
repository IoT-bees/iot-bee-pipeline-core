use actix_web::{HttpResponse, get, http::header, web};
use chrono::Utc;
use serde_json::{Value, json};

use domain::audit::entities::audit_event::AuditFilter;
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::auth::inbound::user_admin_uses::UserAdminUseCases;
use domain::error::IoTBeeError;
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::plan::inbound::plan_uses::PlanUseCases;

use crate::api::error::ApiError;

type OrgUc = dyn OrganizationUseCases + Send + Sync;
type UsersUc = dyn UserAdminUseCases + Send + Sync;
type AuditUc = dyn AuditUseCases + Send + Sync;
type PlansUc = dyn PlanUseCases + Send + Sync;

#[get("/{id}/export")]
pub async fn export_org(
    path: web::Path<i64>,
    org_uc: web::Data<OrgUc>,
    users_uc: web::Data<UsersUc>,
    audit_uc: web::Data<AuditUc>,
    plans_uc: web::Data<PlansUc>,
) -> Result<HttpResponse, ApiError> {
    let org_id = path.into_inner();

    let org = org_uc
        .read(org_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::OrganizationError(e)))?;

    let users = users_uc
        .list(org_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;

    let mut audit_filter = AuditFilter::default();
    audit_filter.organization_id = Some(org_id);
    let audit_page = audit_uc
        .list(audit_filter, None, 200)
        .await
        .map_err(|e| ApiError(IoTBeeError::AuditError(e)))?;

    let plans = plans_uc
        .list(org_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::PlanError(e)))?;

    let body: Value = json!({
        "generated_at": Utc::now().to_rfc3339(),
        "organization": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "created_at": org.created_at.to_rfc3339(),
            "updated_at": org.updated_at.to_rfc3339(),
        },
        "users": users.iter().map(|u| json!({
            "id": u.id,
            "organization_id": u.organization_id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "status": u.status,
            "must_reset_password": u.must_reset_password,
            "created_at": u.created_at.to_rfc3339(),
        })).collect::<Vec<_>>(),
        "audit_events": audit_page.items.iter().map(|e| json!({
            "id": e.id,
            "user_id": e.user_id,
            "user_email": e.user_email,
            "user_role": e.user_role,
            "action": e.action,
            "method": e.method,
            "path": e.path,
            "status_code": e.status_code,
            "ip_address": e.ip_address,
            "created_at": e.created_at.to_rfc3339(),
        })).collect::<Vec<_>>(),
        "plans": plans.iter().map(|p| json!({
            "id": p.id,
            "slug": p.slug,
            "organization_id": p.organization_id,
            "display_name": p.display_name,
            "description": p.description,
            "price_cents": p.price_cents,
            "currency": p.currency,
            "max_pipelines": p.max_pipelines,
            "max_replicas_per_pipeline": p.max_replicas_per_pipeline,
            "alerts_enabled": p.alerts_enabled,
            "premium_connectors": p.premium_connectors,
            "multi_user": p.multi_user,
            "is_custom": p.is_custom,
            "stripe_price_id": p.stripe_price_id,
            "created_at": p.created_at.to_rfc3339(),
            "updated_at": p.updated_at.to_rfc3339(),
        })).collect::<Vec<_>>(),
    });

    let filename = format!("org-{}-export.json", org_id);
    Ok(HttpResponse::Ok()
        .insert_header((
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        ))
        .json(body))
}
