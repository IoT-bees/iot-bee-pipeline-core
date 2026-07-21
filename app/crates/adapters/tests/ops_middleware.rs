use actix_web::http::StatusCode;
use actix_web::{App, HttpMessage, HttpResponse, test, web};
use adapters::api::ops_middleware::RolePolicy;
use chrono::Utc;
use domain::auth::value_objects::claims::JwtClaims;

fn claims(role: &str) -> JwtClaims {
    let now = Utc::now();
    JwtClaims {
        user_id: 7,
        organization_id: 9,
        email: "role@test.local".into(),
        role: role.into(),
        issued_at: now,
        expires_at: now + chrono::Duration::hours(1),
    }
}

#[actix_web::test]
async fn viewer_no_puede_mutar_y_operator_si_puede_operar_recursos() {
    let app = test::init_service(
        App::new()
            .wrap(RolePolicy)
            .route("/resource", web::post().to(HttpResponse::Ok)),
    )
    .await;

    let viewer = test::TestRequest::post().uri("/resource").to_request();
    viewer.extensions_mut().insert(claims("viewer"));
    let viewer_response = test::call_service(&app, viewer).await;
    assert_eq!(viewer_response.status(), StatusCode::FORBIDDEN);

    let operator = test::TestRequest::post().uri("/resource").to_request();
    operator.extensions_mut().insert(claims("operator"));
    let operator_response = test::call_service(&app, operator).await;
    assert_eq!(operator_response.status(), StatusCode::OK);
}
