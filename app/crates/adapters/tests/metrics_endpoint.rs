use actix_web::http::StatusCode;
use actix_web::{App, test};
use adapters::api::metrics::metrics_scope;

#[actix_web::test]
async fn metrics_endpoint_returns_prometheus_text() {
    let app = test::init_service(App::new().service(metrics_scope())).await;

    let req = test::TestRequest::get().uri("/metrics").to_request();
    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::OK);

    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_string();
    assert!(
        content_type.starts_with("text/plain"),
        "unexpected content-type: {content_type}"
    );

    let body = test::read_body(resp).await;
    let body_str = std::str::from_utf8(&body).expect("metrics body is utf-8");

    assert!(
        body_str.contains("iot_bee_build_info"),
        "missing iot_bee_build_info in body:\n{body_str}"
    );
    let has_build_info_line = body_str
        .lines()
        .any(|l| l.starts_with("iot_bee_build_info{") && l.trim_end().ends_with(" 1"));
    assert!(
        has_build_info_line,
        "iot_bee_build_info gauge should be set to 1, body:\n{body_str}"
    );
}
