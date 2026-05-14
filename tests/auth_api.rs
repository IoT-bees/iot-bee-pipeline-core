use std::sync::Arc;

use actix_web::http::StatusCode;
use actix_web::{App, test, web};
use serde_json::json;

use adapters::api::auth::middleware::JwtAuth;
use adapters::api::auth::routers::auth_scope;
use adapters::api::data_sources::routers::data_sources_scope;
use application::auth_cases::cases::AuthUseCasesImpl;
use application::data_sources_cases::cases::{DataSourcesUseCases, DataSourcesUseCasesImpl};
use domain::auth::inbound::auth_uses::AuthUseCases;
use infrastructure::persistence::connection::InternalDataBase;
use infrastructure::persistence::repositories::data_source_repository::DataSourceRepository;
use infrastructure::persistence::repositories::users_repository::SqliteUserRepository;
use infrastructure::security::argon2_hasher::Argon2Hasher;
use infrastructure::security::jwt_issuer::JwtIssuer;

async fn fresh_db() -> Arc<InternalDataBase> {
    let db = Arc::new(InternalDataBase::new("sqlite::memory:").await.unwrap());
    sqlx::migrate!("./migrations").run(db.pool()).await.unwrap();
    db
}

fn auth_data(db: Arc<InternalDataBase>) -> web::Data<dyn AuthUseCases + Send + Sync> {
    let repo = Arc::new(SqliteUserRepository::new(db));
    let hasher = Arc::new(Argon2Hasher::new());
    let issuer = Arc::new(JwtIssuer::new("test-secret".into(), 1));
    let uc: Arc<dyn AuthUseCases + Send + Sync> =
        Arc::new(AuthUseCasesImpl::new(repo, hasher, issuer));
    web::Data::from(uc)
}

fn ds_data(db: Arc<InternalDataBase>) -> web::Data<dyn DataSourcesUseCases + Send + Sync> {
    let repo = Arc::new(DataSourceRepository::new(db));
    let uc: Arc<dyn DataSourcesUseCases + Send + Sync> =
        Arc::new(DataSourcesUseCasesImpl::new(repo));
    web::Data::from(uc)
}

#[actix_web::test]
async fn first_register_then_me_works() {
    let db = fresh_db().await;
    let auth = auth_data(db.clone());
    let app = test::init_service(
        App::new().service(auth_scope(auth.clone())).service(
            web::scope("")
                .app_data(auth.clone())
                .wrap(JwtAuth)
                .service(data_sources_scope(ds_data(db.clone()))),
        ),
    )
    .await;

    let req = test::TestRequest::post()
        .uri("/auth/register")
        .set_json(json!({
            "email": "a@b.com",
            "name": "Ana",
            "password": "secret123"
        }))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::CREATED);
    let body: serde_json::Value = test::read_body_json(resp).await;
    let token = body["token"].as_str().unwrap().to_string();

    let req = test::TestRequest::get()
        .uri("/auth/me")
        .insert_header(("Authorization", format!("Bearer {token}")))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);
}

#[actix_web::test]
async fn second_register_returns_403() {
    let db = fresh_db().await;
    let auth = auth_data(db.clone());
    let app =
        test::init_service(App::new().service(auth_scope(auth.clone()))).await;

    let req = test::TestRequest::post()
        .uri("/auth/register")
        .set_json(json!({"email": "a@b.com", "name": "A", "password": "secret123"}))
        .to_request();
    let _ = test::call_service(&app, req).await;

    let req = test::TestRequest::post()
        .uri("/auth/register")
        .set_json(json!({"email": "c@d.com", "name": "C", "password": "secret789"}))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::FORBIDDEN);
}

#[actix_web::test]
async fn protected_route_without_token_is_401() {
    let db = fresh_db().await;
    let auth = auth_data(db.clone());
    let app = test::init_service(
        App::new().service(auth_scope(auth.clone())).service(
            web::scope("")
                .app_data(auth.clone())
                .wrap(JwtAuth)
                .service(data_sources_scope(ds_data(db.clone()))),
        ),
    )
    .await;
    let req = test::TestRequest::get().uri("/data-sources").to_request();
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[actix_web::test]
async fn protected_route_with_valid_token_passes_middleware() {
    let db = fresh_db().await;
    let auth = auth_data(db.clone());
    let app = test::init_service(
        App::new().service(auth_scope(auth.clone())).service(
            web::scope("")
                .app_data(auth.clone())
                .wrap(JwtAuth)
                .service(data_sources_scope(ds_data(db.clone()))),
        ),
    )
    .await;

    let req = test::TestRequest::post()
        .uri("/auth/register")
        .set_json(json!({"email": "a@b.com", "name": "A", "password": "secret123"}))
        .to_request();
    let body: serde_json::Value = test::call_and_read_body_json(&app, req).await;
    let token = body["token"].as_str().unwrap().to_string();

    let req = test::TestRequest::get()
        .uri("/data-sources")
        .insert_header(("Authorization", format!("Bearer {token}")))
        .to_request();
    let resp = test::call_service(&app, req).await;
    assert!(
        resp.status().is_success(),
        "expected success, got {:?}",
        resp.status()
    );
}
