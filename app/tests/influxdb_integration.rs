//! Tests de integración reales contra InfluxDB.
//!
//! Requieren un servidor InfluxDB en ejecución y las siguientes variables de
//! entorno (se cargan desde `.env` si existe):
//!
//! | Variable               | Descripción                                      |
//! |------------------------|--------------------------------------------------|
//! | `INFLUXDB_URL`         | URL del servidor, p.ej. `http://localhost:8086`  |
//! | `INFLUXDB_BUCKET`      | Nombre del bucket / base de datos                |
//! | `INFLUXDB_MEASUREMENT` | Measurement donde se escriben los datos          |
//! | `INFLUXDB_TOKEN`       | Token de autenticación                           |
//! | `INFLUXDB_TAG_FIELDS`  | Lista de tags separados por coma (puede ser "")  |
//!
//! Si alguna de las variables obligatorias no está definida, el test se omite
//! imprimiendo un aviso en lugar de fallar.

use domain::entities::data_consumer_types::DataConsumerRawType;
use domain::value_objects::data_store_values::{InfluxDbConfig, PipelineDataStoreModel};
use infrastructure::data_external_persistence::external_persistence_factory::ExternalPersistenceFactory;

// ─── Helpers ─────────────────────────────────────────────────────────────────

struct InfluxEnv {
    url: String,
    bucket: String,
    measurement: String,
    token: String,
    tag_fields: Vec<String>,
}

/// Carga las variables de entorno necesarias para los tests.
/// Devuelve `None` si alguna variable obligatoria falta; en ese caso el test
/// debe omitirse con `return`.
fn cargar_env() -> Option<InfluxEnv> {
    dotenvy::dotenv().ok();

    let url = match std::env::var("INFLUXDB_URL") {
        Ok(v) => v,
        Err(_) => {
            println!("[SKIP] INFLUXDB_URL no definida — test de integración omitido");
            return None;
        }
    };
    let bucket = match std::env::var("INFLUXDB_BUCKET") {
        Ok(v) => v,
        Err(_) => {
            println!("[SKIP] INFLUXDB_BUCKET no definida — test de integración omitido");
            return None;
        }
    };
    let measurement = match std::env::var("INFLUXDB_MEASUREMENT") {
        Ok(v) => v,
        Err(_) => {
            println!("[SKIP] INFLUXDB_MEASUREMENT no definida — test de integración omitido");
            return None;
        }
    };
    let token = match std::env::var("INFLUXDB_TOKEN") {
        Ok(v) => v,
        Err(_) => {
            println!("[SKIP] INFLUXDB_TOKEN no definida — test de integración omitido");
            return None;
        }
    };

    // INFLUXDB_TAG_FIELDS es opcional: "device_id,region" → vec!["device_id", "region"]
    let tag_fields = std::env::var("INFLUXDB_TAG_FIELDS")
        .unwrap_or_default()
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect();

    Some(InfluxEnv {
        url,
        bucket,
        measurement,
        token,
        tag_fields,
    })
}

fn crear_model(env: &InfluxEnv) -> PipelineDataStoreModel {
    let cfg = InfluxDbConfig::new(
        &env.url,
        &env.bucket,
        &env.measurement,
        &env.token,
        env.tag_fields.clone(),
    )
    .expect("InfluxDbConfig válida con los valores del entorno");
    PipelineDataStoreModel::InfluxDb(cfg)
}

fn raw(json: &str) -> DataConsumerRawType {
    DataConsumerRawType::new(json.to_string()).expect("JSON válido para test")
}

// ─── Tests ───────────────────────────────────────────────────────────────────

/// La factory crea correctamente el store a partir de las variables de entorno.
#[tokio::test]
async fn influxdb_factory_crea_store_desde_env() {
    let Some(env) = cargar_env() else { return };

    let model = crear_model(&env);
    let resultado = ExternalPersistenceFactory::create_external_persistence(&model);

    assert!(
        resultado.is_ok(),
        "La factory debe crear el store sin error: {:?}",
        resultado.err()
    );
}

/// Escribe un registro con campos numéricos y verifica que el servidor acepta
/// la escritura (responde sin error).
#[tokio::test]
async fn influxdb_save_campos_numericos() {
    let Some(env) = cargar_env() else { return };

    let store = ExternalPersistenceFactory::create_external_persistence(&crear_model(&env))
        .expect("factory debe tener éxito");

    let tag_json = if env.tag_fields.is_empty() {
        String::new()
    } else {
        // Para cada tag field definido, añade un par "campo": "valor_test"
        let pares: Vec<String> = env
            .tag_fields
            .iter()
            .map(|f| format!(r#""{f}": "test_valor""#))
            .collect();
        format!("{}, ", pares.join(", "))
    };

    let json = format!(
        r#"{{{}"temperatura": 25.3, "humedad": 58, "activo": true}}"#,
        tag_json
    );

    let resultado = store.save(raw(&json)).await;
    assert!(
        resultado.is_ok(),
        "save con campos numéricos debe tener éxito: {:?}",
        resultado.err()
    );
}

/// Escribe un registro con un campo de tipo string.
#[tokio::test]
async fn influxdb_save_campo_string() {
    let Some(env) = cargar_env() else { return };

    let store = ExternalPersistenceFactory::create_external_persistence(&crear_model(&env))
        .expect("factory debe tener éxito");

    // Si hay tag fields configurados, el primer field se usa como tag
    let json = if let Some(tag) = env.tag_fields.first() {
        format!(r#"{{"{tag}": "sensor-42", "lectura": 99.1}}"#)
    } else {
        r#"{"descripcion": "test_string", "valor": 1.0}"#.to_string()
    };

    let resultado = store.save(raw(&json)).await;
    assert!(
        resultado.is_ok(),
        "save con campo string debe tener éxito: {:?}",
        resultado.err()
    );
}

/// Verifica que un JSON sin fields válidos es rechazado antes de llegar al
/// servidor, sin importar la configuración de InfluxDB.
#[tokio::test]
async fn influxdb_save_sin_fields_devuelve_error() {
    let Some(env) = cargar_env() else { return };

    let store = ExternalPersistenceFactory::create_external_persistence(&crear_model(&env))
        .expect("factory debe tener éxito");

    // null y arrays son ignorados → no hay fields → error local
    let resultado = store.save(raw(r#"{"nulo": null, "lista": [1, 2]}"#)).await;
    assert!(
        resultado.is_err(),
        "JSON sin fields válidos debe devolver error"
    );
}

/// Verifica que un JSON malformado es rechazado con error de parseo.
#[tokio::test]
async fn influxdb_save_json_malformado_devuelve_error() {
    let Some(env) = cargar_env() else { return };

    let store = ExternalPersistenceFactory::create_external_persistence(&crear_model(&env))
        .expect("factory debe tener éxito");

    let resultado = store.save(raw("no_es_json_valido")).await;
    assert!(resultado.is_err(), "JSON malformado debe devolver error");
}
