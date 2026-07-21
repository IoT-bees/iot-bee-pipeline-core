//! Tests de integración para el destino webhook usando un servidor HTTP embebido.

use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::value_objects::data_store_values::{PipelineDataStoreModel, WebhookConfig};
use infrastructure::data_external_persistence::external_persistence_factory::ExternalPersistenceFactory;
use wiremock::matchers::{body_string, header, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

fn config_webhook(url: &str, bearer_token: Option<&str>) -> PipelineDataStoreModel {
    let config =
        WebhookConfig::new(url, bearer_token.map(str::to_owned)).expect("WebhookConfig válida");
    PipelineDataStoreModel::Webhook(config)
}

fn raw(json: &str) -> DataConsumerRawType {
    DataConsumerRawType::new(json).expect("payload válido para test")
}

#[tokio::test]
async fn factory_crea_destino_webhook_desde_configuracion() {
    let server = MockServer::start().await;

    let result = ExternalPersistenceFactory::create_external_persistence(&config_webhook(
        &server.uri(),
        None,
    ));

    assert!(result.is_ok(), "La factory debe crear el webhook");
}

#[tokio::test]
async fn save_entrega_el_payload_json_y_bearer_token() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/client-ingest"))
        .and(header("content-type", "application/json"))
        .and(header("authorization", "Bearer token-cliente"))
        .and(body_string(r#"{"meter_id":"M-01","kwh":42.5}"#))
        .respond_with(ResponseTemplate::new(202))
        .expect(1)
        .mount(&server)
        .await;

    let store = ExternalPersistenceFactory::create_external_persistence(&config_webhook(
        &format!("{}/client-ingest", server.uri()),
        Some("token-cliente"),
    ))
    .expect("factory debe tener éxito");

    let result = store.save(raw(r#"{"meter_id":"M-01","kwh":42.5}"#)).await;

    assert!(result.is_ok(), "El webhook debe aceptar una respuesta 2xx");
}

#[tokio::test]
async fn save_reintenta_fallos_transitorios_y_reporta_el_error_final() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(500))
        .expect(3)
        .mount(&server)
        .await;

    let store = ExternalPersistenceFactory::create_external_persistence(&config_webhook(
        &server.uri(),
        None,
    ))
    .expect("factory debe tener éxito");

    let result = store.save(raw(r#"{"ok":true}"#)).await;

    assert!(
        result.is_err(),
        "Un webhook 500 debe fallar tras sus reintentos"
    );
}

#[tokio::test]
async fn save_recupera_una_entrega_tras_un_fallo_transitorio() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(503))
        .up_to_n_times(1)
        .expect(1)
        .with_priority(1)
        .mount(&server)
        .await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(202))
        .expect(1)
        .with_priority(2)
        .mount(&server)
        .await;

    let store = ExternalPersistenceFactory::create_external_persistence(&config_webhook(
        &server.uri(),
        None,
    ))
    .expect("factory debe tener éxito");

    let result = store.save(raw(r#"{"ok":true}"#)).await;

    assert!(result.is_ok(), "Un 2xx posterior debe completar la entrega");
}

#[tokio::test]
async fn save_no_reintenta_errores_de_configuracion_del_cliente() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(400))
        .expect(1)
        .mount(&server)
        .await;

    let store = ExternalPersistenceFactory::create_external_persistence(&config_webhook(
        &server.uri(),
        None,
    ))
    .expect("factory debe tener éxito");

    let result = store.save(raw(r#"{"ok":true}"#)).await;

    assert!(
        result.is_err(),
        "Un webhook 400 debe marcarse como un error definitivo"
    );
}

#[tokio::test]
async fn configuracion_rechaza_url_invalida() {
    let model = config_webhook("not a url", None);

    let result = ExternalPersistenceFactory::create_external_persistence(&model);

    assert!(result.is_err(), "Una URL inválida no debe crear un destino");
}

#[tokio::test]
async fn configuracion_rechaza_protocolos_que_no_son_http() {
    let model = config_webhook("ftp://client.example.com/ingest", None);

    let result = ExternalPersistenceFactory::create_external_persistence(&model);

    assert!(result.is_err(), "Un webhook debe usar HTTP o HTTPS");
}
