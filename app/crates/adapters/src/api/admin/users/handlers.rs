use actix_web::{HttpMessage, HttpRequest, HttpResponse, delete, get, patch, post, web};

use domain::auth::entities::user::User;
use domain::auth::inbound::user_admin_uses::{
    CreateUserAsAdminInput, UpdateUserInput, UserAdminUseCases,
};
use domain::auth::value_objects::claims::JwtClaims;
use domain::error::IoTBeeError;

use super::models::{
    AdminUserResponse, AdminUsersListQuery, AdminUsersListResponse, CreateUserRequest,
    PatchUserRequest,
};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn UserAdminUseCases + Send + Sync;

fn to_resp(u: &User) -> AdminUserResponse {
    AdminUserResponse {
        id: u.id,
        organization_id: u.organization_id,
        email: u.email.clone(),
        name: u.name.clone(),
        role: u.role.clone(),
        status: u.status.clone(),
        must_reset_password: u.must_reset_password,
        created_at: u.created_at.to_rfc3339(),
    }
}

fn claims(req: &HttpRequest) -> Result<JwtClaims, ApiError> {
    req.extensions().get::<JwtClaims>().cloned().ok_or_else(|| {
        ApiError(IoTBeeError::AuthError(
            domain::error::AuthError::InvalidToken,
        ))
    })
}

#[utoipa::path(
    get,
    path = "/admin/users",
    responses(
        (status = 200, description = "List", body = AdminUsersListResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[get("")]
pub async fn list(
    req: HttpRequest,
    query: web::Query<AdminUsersListQuery>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let query = query.into_inner();
    let (users, next_cursor) = uc
        .list_page(
            c.organization_id,
            query.cursor,
            query.limit.unwrap_or(50).clamp(1, 200),
            query.q.as_deref(),
            query.status.as_deref(),
        )
        .await
        .map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;
    Ok(HttpResponse::Ok().json(AdminUsersListResponse {
        items: users.iter().map(to_resp).collect(),
        next_cursor,
    }))
}

#[utoipa::path(
    post,
    path = "/admin/users",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "Created", body = AdminUserResponse),
        (status = 400, description = "Invalid", body = ErrorResponse),
        (status = 409, description = "Email taken", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[post("")]
pub async fn create(
    req: HttpRequest,
    body: web::Json<CreateUserRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let body = body.into_inner();
    let u = uc
        .create(CreateUserAsAdminInput {
            organization_id: c.organization_id,
            email: body.email,
            name: body.name,
            role: body.role,
            temp_password: body.temp_password,
        })
        .await
        .map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;
    Ok(HttpResponse::Created().json(to_resp(&u)))
}

#[utoipa::path(
    patch,
    path = "/admin/users/{id}",
    request_body = PatchUserRequest,
    responses(
        (status = 200, description = "Updated", body = AdminUserResponse),
        (status = 400, description = "Invalid", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[patch("/{id}")]
pub async fn patch_user(
    req: HttpRequest,
    path: web::Path<i64>,
    body: web::Json<PatchUserRequest>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let id = path.into_inner();
    let body = body.into_inner();
    let u = uc
        .update(
            c.user_id,
            id,
            UpdateUserInput {
                name: body.name,
                role: body.role,
                status: body.status,
                must_reset_password: body.must_reset_password,
            },
        )
        .await
        .map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;
    Ok(HttpResponse::Ok().json(to_resp(&u)))
}

#[utoipa::path(
    delete,
    path = "/admin/users/{id}",
    responses(
        (status = 204, description = "Deactivated"),
        (status = 400, description = "Cannot deactivate self", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
    ),
    tag = "Admin"
)]
#[delete("/{id}")]
pub async fn deactivate(
    req: HttpRequest,
    path: web::Path<i64>,
    uc: web::Data<UseCase>,
) -> Result<HttpResponse, ApiError> {
    let c = claims(&req)?;
    let target = path.into_inner();
    uc.deactivate(c.user_id, target)
        .await
        .map_err(|e| ApiError(IoTBeeError::UserAdminError(e)))?;
    Ok(HttpResponse::NoContent().finish())
}
