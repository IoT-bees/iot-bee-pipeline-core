/// Pruebas de integración de la capa HTTP (handlers de actix-web).
/// Usan un caso de uso falso para aislar la lógica HTTP de la persistencia.
/// Validan: status codes, contrato JSON y manejo de errores.
use actix_web::dev::Service;
use actix_web::http::StatusCode;
use actix_web::{App, HttpMessage, test, web};
use adapters::api::data_store::routers::data_store_scope;
use application::data_store_cases::cases::DataStoreUseCases;
use async_trait::async_trait;
use chrono::Utc;
use domain::auth::value_objects::claims::JwtClaims;
use domain::entities::data_store::{PipelineDataStoreInputModel, PipelineDataStoreOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::value_objects::data_store_values::{LocalLogConfig, PipelineDataStoreModel};
use serde_json::json;
use std::sync::Arc;

fn test_claims() -> JwtClaims {
    let now = Utc::now();
    JwtClaims {
        user_id: 1,
        organization_id: 1,
        email: "test@test".into(),
        role: "admin".into(),
        issued_at: now,
        expires_at: now + chrono::Duration::hours(1),
    }
}

// ─── Casos de uso falsos ──────────────────────────────────────────────────────

/// Simula una BD vacía: create siempre ok, get devuelve lista vacía o not found.
struct UseCaseVacio;

#[async_trait]
impl DataStoreUseCases for UseCaseVacio {
    async fn create_data_store(
        &self,
        _: i64,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }
    async fn get_data_store(
        &self,
        _: i64,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        Ok(vec![])
    }
    async fn get_data_store_by_id(
        &self,
        _: i64,
        id: &u32,
    ) -> Result<PipelineDataStoreOutputModel, IoTBeeError> {
        Err(PipelinePersistenceError::IdNotFound { id: *id }.into())
    }

    async fn test_data_store(&self, _: i64, id: &u32) -> Result<String, IoTBeeError> {
        Err(PipelinePersistenceError::IdNotFound { id: *id }.into())
    }

    async fn update_data_store_configuration(
        &self,
        _: i64,
        _: &u32,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }

    async fn delete_data_store(&self, _: i64, _: &u32) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

/// Simula una BD con un registro existente.
struct UseCaseConDatos;

#[async_trait]
impl DataStoreUseCases for UseCaseConDatos {
    async fn create_data_store(
        &self,
        _: i64,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }
    async fn get_data_store(
        &self,
        _: i64,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        let config = PipelineDataStoreModel::LocalLog(LocalLogConfig::new("test-log").unwrap());
        let modelo = PipelineDataStoreOutputModel::new(
            1,
            "store-produccion",
            config,
            "Store de producción",
            Utc::now(),
            Utc::now(),
        )
        .unwrap();
        Ok(vec![modelo])
    }
    async fn get_data_store_by_id(
        &self,
        _: i64,
        _: &u32,
    ) -> Result<PipelineDataStoreOutputModel, IoTBeeError> {
        let config = PipelineDataStoreModel::LocalLog(LocalLogConfig::new("test-log").unwrap());
        Ok(PipelineDataStoreOutputModel::new(
            1,
            "store-produccion",
            config,
            "Store de producción",
            Utc::now(),
            Utc::now(),
        )
        .unwrap())
    }

    async fn test_data_store(&self, _: i64, _: &u32) -> Result<String, IoTBeeError> {
        Ok("connection ok".to_string())
    }

    async fn update_data_store_configuration(
        &self,
        _: i64,
        _: &u32,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }

    async fn delete_data_store(&self, _: i64, _: &u32) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

/// Simula un nombre duplicado al crear.
struct UseCaseNombreDuplicado;

#[async_trait]
impl DataStoreUseCases for UseCaseNombreDuplicado {
    async fn create_data_store(
        &self,
        _: i64,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Err(PipelinePersistenceError::ValidationSchemaNameExists {
            name: "store-duplicado".to_string(),
        }
        .into())
    }
    async fn get_data_store(
        &self,
        _: i64,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        Ok(vec![])
    }
    async fn get_data_store_by_id(
        &self,
        _: i64,
        id: &u32,
    ) -> Result<PipelineDataStoreOutputModel, IoTBeeError> {
        Err(PipelinePersistenceError::IdNotFound { id: *id }.into())
    }

    async fn test_data_store(&self, _: i64, id: &u32) -> Result<String, IoTBeeError> {
        Err(PipelinePersistenceError::IdNotFound { id: *id }.into())
    }

    async fn update_data_store_configuration(
        &self,
        _: i64,
        _: &u32,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }

    async fn delete_data_store(&self, _: i64, _: &u32) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn body_valido() -> serde_json::Value {
    json!({
        "name": "mi-store",
        "dataStoreConfiguration": {
            "persistenceType": "LOCAL_LOG",
            "log_name": "test-log"
        },
        "dataStoreDescription": "Store de prueba para tests de integración"
    })
}

fn body_nombre_vacio() -> serde_json::Value {
    json!({
        "name": "",
        "dataStoreConfiguration": {
            "persistenceType": "LOCAL_LOG",
            "log_name": "test-log"
        },
        "dataStoreDescription": "Una descripción válida"
    })
}

// ─── Tests: POST /data-stores ─────────────────────────────────────────────────

#[actix_web::test]
async fn post_data_store_con_body_valido_devuelve_201() {
    let use_case: Arc<dyn DataStoreUseCases + Send + Sync> = Arc::new(UseCaseVacio);
    let use_case_data = web::Data::from(use_case);

    let app = test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(test_claims());
                srv.call(req)
            })
            .service(data_store_scope(use_case_data)),
    )
    .await;

    let req = test::TestRequest::post()
        .uri("/data-stores")
        .set_json(body_valido())
        .to_request();

    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::CREATED);
}

#[actix_web::test]
async fn post_data_store_con_nombre_vacio_devuelve_400() {
    let use_case: Arc<dyn DataStoreUseCases + Send + Sync> = Arc::new(UseCaseVacio);
    let use_case_data = web::Data::from(use_case);

    let app = test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(test_claims());
                srv.call(req)
            })
            .service(data_store_scope(use_case_data)),
    )
    .await;

    let req = test::TestRequest::post()
        .uri("/data-stores")
        .set_json(body_nombre_vacio())
        .to_request();

    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

#[actix_web::test]
async fn post_data_store_con_nombre_duplicado_devuelve_409() {
    let use_case: Arc<dyn DataStoreUseCases + Send + Sync> = Arc::new(UseCaseNombreDuplicado);
    let use_case_data = web::Data::from(use_case);

    let app = test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(test_claims());
                srv.call(req)
            })
            .service(data_store_scope(use_case_data)),
    )
    .await;

    let req = test::TestRequest::post()
        .uri("/data-stores")
        .set_json(body_valido())
        .to_request();

    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::CONFLICT);
}

#[actix_web::test]
async fn post_data_store_sin_body_devuelve_400() {
    let use_case: Arc<dyn DataStoreUseCases + Send + Sync> = Arc::new(UseCaseVacio);
    let use_case_data = web::Data::from(use_case);

    let app = test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(test_claims());
                srv.call(req)
            })
            .service(data_store_scope(use_case_data)),
    )
    .await;

    let req = test::TestRequest::post().uri("/data-stores").to_request();

    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
}

// ─── Tests: GET /data-stores ──────────────────────────────────────────────────

#[actix_web::test]
async fn get_data_stores_devuelve_200_con_lista_vacia() {
    let use_case: Arc<dyn DataStoreUseCases + Send + Sync> = Arc::new(UseCaseVacio);
    let use_case_data = web::Data::from(use_case);

    let app = test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(test_claims());
                srv.call(req)
            })
            .service(data_store_scope(use_case_data)),
    )
    .await;

    let req = test::TestRequest::get().uri("/data-stores").to_request();

    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::OK);
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body.as_array().unwrap().is_empty());
}

#[actix_web::test]
async fn get_data_stores_devuelve_200_con_datos() {
    let use_case: Arc<dyn DataStoreUseCases + Send + Sync> = Arc::new(UseCaseConDatos);
    let use_case_data = web::Data::from(use_case);

    let app = test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(test_claims());
                srv.call(req)
            })
            .service(data_store_scope(use_case_data)),
    )
    .await;

    let req = test::TestRequest::get().uri("/data-stores").to_request();

    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::OK);
    let body: serde_json::Value = test::read_body_json(resp).await;
    let lista = body.as_array().unwrap();
    assert_eq!(lista.len(), 1);
    assert_eq!(lista[0]["name"], "store-produccion");
}

// ─── Tests: GET /data-stores/{id} ────────────────────────────────────────────

#[actix_web::test]
async fn get_data_store_por_id_existente_devuelve_200() {
    let use_case: Arc<dyn DataStoreUseCases + Send + Sync> = Arc::new(UseCaseConDatos);
    let use_case_data = web::Data::from(use_case);

    let app = test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(test_claims());
                srv.call(req)
            })
            .service(data_store_scope(use_case_data)),
    )
    .await;

    let req = test::TestRequest::get().uri("/data-stores/1").to_request();

    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::OK);
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["name"], "store-produccion");
    assert_eq!(body["id"], 1);
}

#[actix_web::test]
async fn get_data_store_por_id_inexistente_devuelve_404() {
    let use_case: Arc<dyn DataStoreUseCases + Send + Sync> = Arc::new(UseCaseVacio);
    let use_case_data = web::Data::from(use_case);

    let app = test::init_service(
        App::new()
            .wrap_fn(|req, srv| {
                req.extensions_mut().insert(test_claims());
                srv.call(req)
            })
            .service(data_store_scope(use_case_data)),
    )
    .await;

    let req = test::TestRequest::get().uri("/data-stores/99").to_request();

    let resp = test::call_service(&app, req).await;

    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}
