use std::collections::HashMap;
use std::future::{Ready, ready};
use std::rc::Rc;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use actix_web::body::EitherBody;
use actix_web::dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready};
use actix_web::http::Method;
use actix_web::{Error, HttpMessage, HttpResponse};
use domain::audit::entities::audit_event::NewAuditEvent;
use domain::audit::outbound::audit_repository::AuditRepository;
use domain::auth::value_objects::claims::JwtClaims;
use futures_util::future::LocalBoxFuture;
use logging::AppLogger;

static AUDIT_LOGGER: AppLogger = AppLogger::new("iot_bee::audit");

#[derive(Clone)]
pub struct RateLimit {
    state: Arc<Mutex<HashMap<String, RateWindow>>>,
    max_requests: u32,
    window: Duration,
}

#[derive(Clone)]
struct RateWindow {
    started_at: Instant,
    count: u32,
}

impl Default for RateLimit {
    fn default() -> Self {
        Self {
            state: Arc::new(Mutex::new(HashMap::new())),
            max_requests: 180,
            window: Duration::from_secs(60),
        }
    }
}

impl RateLimit {
    pub fn with_limits(max_requests: u32, window: Duration) -> Self {
        Self {
            state: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window,
        }
    }

    fn allow(&self, key: &str) -> bool {
        let Ok(mut state) = self.state.lock() else {
            return true;
        };
        let now = Instant::now();
        let window = state.entry(key.to_string()).or_insert(RateWindow {
            started_at: now,
            count: 0,
        });
        if now.duration_since(window.started_at) > self.window {
            window.started_at = now;
            window.count = 0;
        }
        window.count += 1;
        window.count <= self.max_requests
    }
}

impl<S, B> Transform<S, ServiceRequest> for RateLimit
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = RateLimitMw<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RateLimitMw {
            service: Rc::new(service),
            limiter: self.clone(),
        }))
    }
}

pub struct RateLimitMw<S> {
    service: Rc<S>,
    limiter: RateLimit,
}

impl<S, B> Service<ServiceRequest> for RateLimitMw<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        let limiter = self.limiter.clone();
        Box::pin(async move {
            let key = req
                .connection_info()
                .realip_remote_addr()
                .unwrap_or("unknown")
                .to_string();
            if !limiter.allow(&key) {
                let resp = HttpResponse::TooManyRequests().json(
                    serde_json::json!({"error": "too many requests; slow down and try again"}),
                );
                return Ok(req.into_response(resp).map_into_right_body());
            }
            let res = svc.call(req).await?;
            Ok(res.map_into_left_body())
        })
    }
}

pub struct RolePolicy;

impl<S, B> Transform<S, ServiceRequest> for RolePolicy
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = RolePolicyMw<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RolePolicyMw {
            service: Rc::new(service),
        }))
    }
}

pub struct RolePolicyMw<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for RolePolicyMw<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        Box::pin(async move {
            let method = req.method().clone();
            let allowed = if matches!(method, Method::GET | Method::HEAD | Method::OPTIONS) {
                true
            } else {
                req.extensions()
                    .get::<JwtClaims>()
                    .is_some_and(|claims| matches!(claims.role.as_str(), "admin" | "operator"))
            };
            if !allowed {
                let resp = HttpResponse::Forbidden()
                    .json(serde_json::json!({"error": "your role is read-only for this action"}));
                return Ok(req.into_response(resp).map_into_right_body());
            }
            let res = svc.call(req).await?;
            Ok(res.map_into_left_body())
        })
    }
}

#[derive(Clone)]
pub struct AuditLog {
    repo: Arc<dyn AuditRepository>,
}

impl AuditLog {
    pub fn new(repo: Arc<dyn AuditRepository>) -> Self {
        Self { repo }
    }
}

impl<S, B> Transform<S, ServiceRequest> for AuditLog
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = AuditLogMw<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuditLogMw {
            service: Rc::new(service),
            repo: self.repo.clone(),
        }))
    }
}

pub struct AuditLogMw<S> {
    service: Rc<S>,
    repo: Arc<dyn AuditRepository>,
}

impl<S, B> Service<ServiceRequest> for AuditLogMw<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        let repo = self.repo.clone();
        let method = req.method().to_string();
        let path = req.path().to_string();
        let ip = req
            .connection_info()
            .realip_remote_addr()
            .unwrap_or("unknown")
            .to_string();
        let claims = req.extensions().get::<JwtClaims>().cloned();
        Box::pin(async move {
            let res = svc.call(req).await?;
            if !matches!(method.as_str(), "GET" | "HEAD" | "OPTIONS") {
                if let Some(claims) = claims {
                    AUDIT_LOGGER.info(&format!(
                        "org={} user={} role={} method={} path={} status={} ip={}",
                        claims.organization_id,
                        claims.email,
                        claims.role,
                        method,
                        path,
                        res.status().as_u16(),
                        ip
                    ));
                    let event = NewAuditEvent {
                        organization_id: Some(claims.organization_id),
                        user_id: Some(claims.user_id),
                        user_email: Some(claims.email.clone()),
                        user_role: Some(claims.role.clone()),
                        action: format!("{} {}", method, path),
                        method: method.clone(),
                        path: path.clone(),
                        status_code: Some(res.status().as_u16() as i64),
                        ip_address: Some(ip.clone()),
                    };
                    let repo = repo.clone();
                    tokio::spawn(async move {
                        if let Err(e) = repo.record(event).await {
                            AUDIT_LOGGER.warn(&format!("audit persistence failed: {}", e));
                        }
                    });
                }
            }
            Ok(res)
        })
    }
}

pub struct AdminOnly;

impl<S, B> Transform<S, ServiceRequest> for AdminOnly
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = AdminOnlyMw<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AdminOnlyMw {
            service: Rc::new(service),
        }))
    }
}

pub struct AdminOnlyMw<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AdminOnlyMw<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let svc = self.service.clone();
        Box::pin(async move {
            let allowed = req
                .extensions()
                .get::<JwtClaims>()
                .map(|c| c.role == "admin")
                .unwrap_or(false);
            if !allowed {
                let resp =
                    HttpResponse::Forbidden().json(serde_json::json!({"error": "admin only"}));
                return Ok(req.into_response(resp).map_into_right_body());
            }
            let res = svc.call(req).await?;
            Ok(res.map_into_left_body())
        })
    }
}
