use actix_web::{Scope, web};

use domain::audit::inbound::audit_uses::AuditUseCases;
use domain::auth::inbound::user_admin_uses::UserAdminUseCases;
use domain::organization::inbound::organization_uses::OrganizationUseCases;
use domain::system::inbound::system_uses::SystemUseCases;

use super::audit::routers::audit_scope;
use super::organization::routers::organization_scope;
use super::system::routers::system_scope;
use super::users::routers::users_scope;

pub struct AdminUseCases {
    pub audit: web::Data<dyn AuditUseCases + Send + Sync>,
    pub system: web::Data<dyn SystemUseCases + Send + Sync>,
    pub users: web::Data<dyn UserAdminUseCases + Send + Sync>,
    pub organization: web::Data<dyn OrganizationUseCases + Send + Sync>,
}

pub fn admin_scope(uc: AdminUseCases) -> Scope {
    web::scope("/admin")
        .service(audit_scope(uc.audit))
        .service(system_scope(uc.system))
        .service(users_scope(uc.users))
        .service(organization_scope(uc.organization))
}
