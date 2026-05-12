//! Tests de integración para `InfluxDbPersistence`.
//!
//! Se utiliza `ExternalPersistenceFactory::create_external_persistence` para
//! construir la instancia, igual que lo haría el resto de la aplicación.
//! Un servidor HTTP embebido (wiremock) simula el endpoint de escritura de
//! InfluxDB para que los tests no dependan de infraestructura externa.

use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::value_objects::data_store_values::{InfluxDbConfig, PipelineDataStoreModel};
use infrastructure::data_external_persistence::external_persistence_factory::ExternalPersistenceFactory;
use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Construye un `PipelineDataStoreModel::InfluxDb` apuntando al servidor mock.
fn config_influxdb(servidor_url: &str, tag_fields: Vec<String>) -> PipelineDataStoreModel {
    let cfg = InfluxDbConfig::new(
        servidor_url,
        "test_bucket",
        "sensores",
        "token_secreto",
        tag_fields,
    )
    .expect("InfluxDbConfig válida");
    PipelineDataStoreModel::InfluxDb(cfg)
}

/// Envuelve un string JSON en el tipo que consume el store.
fn raw(json: &str) -> DataConsumerRawType {
    DataConsumerRawType::new(json.to_string()).expect("JSON válido para test")
}

// ─── Tests ───────────────────────────────────────────────────────────────────

/// La factory debe crear el store correctamente a partir de una configuración
/// `InfluxDb` sin devolver error.
#[tokio::test]
async fn factory_crea_influxdb_persistence_desde_config() {
    let servidor = MockServer::start().await;
    let model = config_influxdb(&servidor.uri(), vec![]);

    let resultado = ExternalPersistenceFactory::create_external_persistence(&model);

    assert!(
        resultado.is_ok(),
        "La factory debe crear el store sin error: {:?}",
        resultado.err()
    );
}

/// Un JSON con campos numéricos y un tag debe guardarse correctamente.
/// El mock devuelve 204 No Content (respuesta estándar de InfluxDB).
#[tokio::test]
async fn save_con_campos_y_tag_envia_al_servidor() {
    let servidor = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex(r"^/write"))
        .respond_with(ResponseTemplate::new(204))
        .expect(1)
        .mount(&servidor)
        .await;

    let model = config_influxdb(&servidor.uri(), vec!["device_id".to_string()]);
    let store = ExternalPersistenceFactory::create_external_persistence(&model)
        .expect("factory debe tener éxito");

    let json = r#"{"device_id": "sensor-01", "temperatura": 23.5, "humedad": 60}"#;
    let resultado = store.save(raw(json)).await;

    assert!(
        resultado.is_ok(),
        "save debe tener éxito: {:?}",
        resultado.err()
    );
}

/// Un JSON con campos enteros debe guardarse sin errores de tipo.
#[tokio::test]
async fn save_con_campo_entero_envia_al_servidor() {
    let servidor = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex(r"^/write"))
        .respond_with(ResponseTemplate::new(204))
        .expect(1)
        .mount(&servidor)
        .await;

    let model = config_influxdb(&servidor.uri(), vec![]);
    let store = ExternalPersistenceFactory::create_external_persistence(&model)
        .expect("factory debe tener éxito");

    let json = r#"{"contador": 42, "activo": true}"#;
    let resultado = store.save(raw(json)).await;

    assert!(
        resultado.is_ok(),
        "save con entero debe tener éxito: {:?}",
        resultado.err()
    );
}

/// Un JSON que no es objeto debe devolver un error de parseo.
#[tokio::test]
async fn save_con_json_no_objeto_devuelve_error() {
    let servidor = MockServer::start().await;
    // No configuramos mock: el servidor no debe recibir ninguna llamada.

    let model = config_influxdb(&servidor.uri(), vec![]);
    let store = ExternalPersistenceFactory::create_external_persistence(&model)
        .expect("factory debe tener éxito");

    let resultado = store.save(raw(r#"[1, 2, 3]"#)).await;

    assert!(resultado.is_err(), "JSON array debe devolver error");
}

/// Un JSON con solo nulls y arrays (sin fields válidos) debe devolver error.
#[tokio::test]
async fn save_sin_fields_validos_devuelve_error() {
    let servidor = MockServer::start().await;

    let model = config_influxdb(&servidor.uri(), vec![]);
    let store = ExternalPersistenceFactory::create_external_persistence(&model)
        .expect("factory debe tener éxito");

    // null y array son ignorados → no hay fields → debe fallar
    let json = r#"{"campo_nulo": null, "lista": [1, 2, 3]}"#;
    let resultado = store.save(raw(json)).await;

    assert!(
        resultado.is_err(),
        "JSON sin fields válidos debe devolver error"
    );
}

/// Un JSON con solo tags (sin ningún field de valor) debe devolver error.
#[tokio::test]
async fn save_con_solo_tags_sin_fields_devuelve_error() {
    let servidor = MockServer::start().await;

    // "device_id" es tag → sin fields → debe fallar sin llamar al servidor
    let model = config_influxdb(&servidor.uri(), vec!["device_id".to_string()]);
    let store = ExternalPersistenceFactory::create_external_persistence(&model)
        .expect("factory debe tener éxito");

    let json = r#"{"device_id": "sensor-01"}"#;
    let resultado = store.save(raw(json)).await;

    assert!(
        resultado.is_err(),
        "Solo tags sin fields debe devolver error"
    );
}

/// JSON inválido (no es JSON) debe devolver error de parseo.
#[tokio::test]
async fn save_con_json_malformado_devuelve_error() {
    let servidor = MockServer::start().await;

    let model = config_influxdb(&servidor.uri(), vec![]);
    let store = ExternalPersistenceFactory::create_external_persistence(&model)
        .expect("factory debe tener éxito");

    let resultado = store.save(raw("esto_no_es_json")).await;

    assert!(resultado.is_err(), "JSON malformado debe devolver error");
}
