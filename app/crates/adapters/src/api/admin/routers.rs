use actix_web::{Scope, web};

use application::license_cases::cases::LicenseUseCases;
use application::pipeline_data_cases::cases::PipelineDataUseCases;
use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::auth::inbound::user_admin_uses::UserAdminUseCases;
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::plan::inbound::plan_uses::PlanUseCases;
use domain::system::inbound::system_uses::SystemUseCases;

use super::audit::routers::audit_scope;
use super::billing::routers::billing_scope;
use super::organization::routers::organization_scope;
use super::orgs::delete_org::delete_org;
use super::orgs::export::export_org;
use super::orgs::state::{OrgStateDeps, orgs_scope};
use super::plans::routers::plans_scope;
use super::system::routers::system_scope;
use super::users::routers::users_scope;

pub struct AdminUseCases {
    pub audit: web::Data<dyn AuditUseCases + Send + Sync>,
    pub system: web::Data<dyn SystemUseCases + Send + Sync>,
    pub users: web::Data<dyn UserAdminUseCases + Send + Sync>,
    pub organization: web::Data<dyn OrganizationUseCases + Send + Sync>,
    pub plans: web::Data<dyn PlanUseCases + Send + Sync>,
    pub license: web::Data<dyn LicenseUseCases + Send + Sync>,
    pub pipelines: web::Data<dyn PipelineDataUseCases + Send + Sync>,
}

pub fn admin_scope(uc: AdminUseCases) -> Scope {
    web::scope("/admin")
        .service(audit_scope(uc.audit.clone()))
        .service(system_scope(uc.system))
        .service(users_scope(uc.users.clone()))
        .service(organization_scope(uc.organization.clone()))
        .service(plans_scope(uc.plans.clone()))
        .service(billing_scope(uc.license.clone()))
        .service(
            orgs_scope(OrgStateDeps {
                orgs: uc.organization,
                license: uc.license,
                pipelines: uc.pipelines,
                audit: uc.audit,
            })
            .app_data(uc.users)
            .app_data(uc.plans)
            .service(export_org)
            .service(delete_org),
        )
}
