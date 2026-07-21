use actix_web::{HttpRequest, HttpResponse, get, post, web};

use application::audit_cases::cases::record_auth_event;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::auth::entities::user::User;
use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::error::{AuthError, IoTBeeError};

use super::models::{
    AuthResponse, HasUsersResponse, LoginRequest, MeResponse, RegisterRequest, UserResponse,
};
use crate::api::error::{ApiError, ErrorResponse};

type UseCase = dyn AuthUseCases + Send + Sync;
type AuditRepo = dyn AuditRepository;

fn client_ip(req: &HttpRequest) -> Option<String> {
    req.connection_info().realip_remote_addr().map(String::from)
}

fn auth_err_status(e: &AuthError) -> i64 {
    match e {
        AuthError::InvalidCredentials | AuthError::InvalidToken | AuthError::ExpiredToken => 401,
        AuthError::EmailAlreadyTaken { .. } => 409,
        AuthError::RegistrationDisabled | AuthError::Forbidden => 403,
        AuthError::WeakPassword { .. } => 400,
        AuthError::Internal { .. } => 500,
    }
}

fn user_resp(u: &User) -> UserResponse {
    UserResponse {
        id: u.id,
        organization_id: u.organization_id,
        email: u.email.clone(),
        name: u.name.clone(),
        role: u.role.clone(),
        status: u.status.clone(),
    }
}

#[utoipa::path(
    post,
    path = "/auth/register",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "Admin account created", body = AuthResponse),
        (status = 400, description = "Weak password", body = ErrorResponse),
        (status = 403, description = "Registration disabled (a user already exists)", body = ErrorResponse),
        (status = 409, description = "Email already taken", body = ErrorResponse),
    ),
    tag = "Auth"
)]
#[post("/register")]
pub async fn register(
    req: HttpRequest,
    body: web::Json<RegisterRequest>,
    use_case: web::Data<UseCase>,
    audit: web::Data<AuditRepo>,
) -> Result<HttpResponse, ApiError> {
    let body = body.into_inner();
    let ip = client_ip(&req);
    let email = body.email.clone();
    let result = use_case
        .register(body.email, body.name, body.password)
        .await;
    match result {
        Ok((user, token)) => {
            record_auth_event(
                audit.get_ref(),
                Some(user.organization_id),
                Some(user.id),
                Some(user.email.clone()),
                "auth.register.ok",
                ip,
                201,
            )
            .await;
            Ok(HttpResponse::Created().json(AuthResponse {
                user: user_resp(&user),
                token,
            }))
        }
        Err(e) => {
            record_auth_event(
                audit.get_ref(),
                None,
                None,
                Some(email),
                "auth.register.fail",
                ip,
                auth_err_status(&e),
            )
            .await;
            Err(ApiError(IoTBeeError::AuthError(e)))
        }
    }
}

#[utoipa::path(
    post,
    path = "/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = AuthResponse),
        (status = 401, description = "Invalid credentials", body = ErrorResponse),
    ),
    tag = "Auth"
)]
#[post("/login")]
pub async fn login(
    req: HttpRequest,
    body: web::Json<LoginRequest>,
    use_case: web::Data<UseCase>,
    audit: web::Data<AuditRepo>,
) -> Result<HttpResponse, ApiError> {
    let body = body.into_inner();
    let ip = client_ip(&req);
    let email = body.email.clone();
    let result = use_case.login(body.email, body.password).await;
    match result {
        Ok((user, token)) => {
            record_auth_event(
                audit.get_ref(),
                Some(user.organization_id),
                Some(user.id),
                Some(user.email.clone()),
                "auth.login.ok",
                ip,
                200,
            )
            .await;
            Ok(HttpResponse::Ok().json(AuthResponse {
                user: user_resp(&user),
                token,
            }))
        }
        Err(e) => {
            record_auth_event(
                audit.get_ref(),
                None,
                None,
                Some(email),
                "auth.login.fail",
                ip,
                auth_err_status(&e),
            )
            .await;
            Err(ApiError(IoTBeeError::AuthError(e)))
        }
    }
}

#[utoipa::path(
    get,
    path = "/auth/has-users",
    responses(
        (status = 200, description = "Whether at least one user exists", body = HasUsersResponse),
    ),
    tag = "Auth"
)]
#[get("/has-users")]
pub async fn has_users(use_case: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let v = use_case
        .has_users()
        .await
        .map_err(|e| ApiError(IoTBeeError::AuthError(e)))?;
    Ok(HttpResponse::Ok().json(HasUsersResponse { has_users: v }))
}

#[utoipa::path(
    get,
    path = "/auth/me",
    responses(
        (status = 200, description = "Current user info", body = MeResponse),
        (status = 401, description = "Missing or invalid token", body = ErrorResponse),
    ),
    tag = "Auth"
)]
#[get("/me")]
pub async fn me(req: HttpRequest, use_case: web::Data<UseCase>) -> Result<HttpResponse, ApiError> {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or_else(|| ApiError(IoTBeeError::AuthError(AuthError::InvalidToken)))?;
    let claims = use_case
        .verify_token(token)
        .await
        .map_err(|e| ApiError(IoTBeeError::AuthError(e)))?;
    let user = use_case
        .get_user(claims.user_id)
        .await
        .map_err(|e| ApiError(IoTBeeError::AuthError(e)))?;
    Ok(HttpResponse::Ok().json(MeResponse {
        user: user_resp(&user),
    }))
}
