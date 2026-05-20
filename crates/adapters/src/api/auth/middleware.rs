use std::future::{Ready, ready};
use std::rc::Rc;

use actix_web::body::EitherBody;
use actix_web::dev::{Service, ServiceRequest, ServiceResponse, Transform, forward_ready};
use actix_web::{Error, HttpMessage, HttpResponse, web};
use futures_util::future::LocalBoxFuture;

use domain::auth::inbound::auth_uses::AuthUseCases;
use domain::error::AuthError;

pub struct JwtAuth;

impl<S, B> Transform<S, ServiceRequest> for JwtAuth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<EitherBody<B>>;
    type Error = Error;
    type InitError = ();
    type Transform = JwtAuthMw<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(JwtAuthMw {
            service: Rc::new(service),
        }))
    }
}

pub struct JwtAuthMw<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for JwtAuthMw<S>
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
            let token = req
                .headers()
                .get("Authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.strip_prefix("Bearer "))
                .map(|s| s.to_string());

            let Some(token) = token else {
                let resp = HttpResponse::Unauthorized()
                    .json(serde_json::json!({"error": "missing bearer token"}));
                return Ok(req.into_response(resp).map_into_right_body());
            };

            let uc = req
                .app_data::<web::Data<dyn AuthUseCases + Send + Sync>>()
                .cloned();
            let Some(uc) = uc else {
                let resp = HttpResponse::InternalServerError()
                    .json(serde_json::json!({"error": "auth use case not wired"}));
                return Ok(req.into_response(resp).map_into_right_body());
            };

            match uc.verify_token(&token).await {
                Ok(claims) => {
                    req.extensions_mut().insert(claims);
                    let res = svc.call(req).await?;
                    Ok(res.map_into_left_body())
                }
                Err(AuthError::ExpiredToken) => {
                    let resp = HttpResponse::Unauthorized()
                        .json(serde_json::json!({"error": "token expired"}));
                    Ok(req.into_response(resp).map_into_right_body())
                }
                Err(_) => {
                    let resp = HttpResponse::Unauthorized()
                        .json(serde_json::json!({"error": "invalid token"}));
                    Ok(req.into_response(resp).map_into_right_body())
                }
            }
        })
    }
}
