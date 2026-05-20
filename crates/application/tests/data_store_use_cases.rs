use application::data_store_cases::cases::{DataStoreUseCases, DataStoreUseCasesImpl};
/// Pruebas de la capa de aplicación usando repositorios falsos (fake).
/// Validan que los casos de uso orquesten correctamente el repositorio
/// y propaguen errores con la semántica correcta.
use async_trait::async_trait;
use chrono::Utc;
use domain::entities::data_store::{PipelineDataStoreInputModel, PipelineDataStoreOutputModel};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineDataStoreRepository;
use domain::value_objects::data_store_values::{LocalLogConfig, PipelineDataStoreModel};
use domain::value_objects::pipelines_values::DataStoreId;
use std::sync::Arc;

const TEST_ORG_ID: i64 = 1;

// ─── Repositorios falsos ──────────────────────────────────────────────────────

/// Repositorio sin datos: simula una BD vacía.
struct FakeRepoVacio;

#[async_trait]
impl PipelineDataStoreRepository for FakeRepoVacio {
    async fn save_pipeline_data_store(
        &self,
        _org_id: i64,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }

    async fn get_pipeline_data_store(
        &self,
        _org_id: i64,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        Ok(vec![])
    }

    async fn get_pipeline_data_store_by_id(
        &self,
        _org_id: i64,
        _: &DataStoreId,
    ) -> Result<Option<PipelineDataStoreOutputModel>, IoTBeeError> {
        Ok(None)
    }

    async fn update_pipeline_data_store_configuration(
        &self,
        _org_id: i64,
        _: &DataStoreId,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }

    async fn delete_pipeline_data_store(
        &self,
        _org_id: i64,
        _: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

/// Repositorio con un registro de ejemplo.
struct FakeRepoConDatos;

#[async_trait]
impl PipelineDataStoreRepository for FakeRepoConDatos {
    async fn save_pipeline_data_store(
        &self,
        _org_id: i64,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }

    async fn get_pipeline_data_store(
        &self,
        _org_id: i64,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        let config = PipelineDataStoreModel::LocalLog(LocalLogConfig::new("test-log").unwrap());
        let modelo = PipelineDataStoreOutputModel::new(
            1,
            "store-ejemplo",
            config,
            "Store de ejemplo para tests",
            Utc::now(),
            Utc::now(),
        )
        .unwrap();
        Ok(vec![modelo])
    }

    async fn get_pipeline_data_store_by_id(
        &self,
        _org_id: i64,
        _: &DataStoreId,
    ) -> Result<Option<PipelineDataStoreOutputModel>, IoTBeeError> {
        let config = PipelineDataStoreModel::LocalLog(LocalLogConfig::new("test-log").unwrap());
        let modelo = PipelineDataStoreOutputModel::new(
            1,
            "store-ejemplo",
            config,
            "Store de ejemplo para tests",
            Utc::now(),
            Utc::now(),
        )
        .unwrap();
        Ok(Some(modelo))
    }

    async fn update_pipeline_data_store_configuration(
        &self,
        _org_id: i64,
        _: &DataStoreId,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }

    async fn delete_pipeline_data_store(
        &self,
        _org_id: i64,
        _: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        Ok(())
    }
}

/// Repositorio que siempre falla: simula error de base de datos.
struct FakeRepoFallido {
    razon: String,
}

#[async_trait]
impl PipelineDataStoreRepository for FakeRepoFallido {
    async fn save_pipeline_data_store(
        &self,
        _org_id: i64,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Err(PipelinePersistenceError::SaveFailed {
            reason: self.razon.clone(),
        }
        .into())
    }

    async fn get_pipeline_data_store(
        &self,
        _org_id: i64,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError> {
        Err(PipelinePersistenceError::Database {
            reason: self.razon.clone(),
        }
        .into())
    }

    async fn get_pipeline_data_store_by_id(
        &self,
        _org_id: i64,
        _: &DataStoreId,
    ) -> Result<Option<PipelineDataStoreOutputModel>, IoTBeeError> {
        Err(PipelinePersistenceError::Database {
            reason: self.razon.clone(),
        }
        .into())
    }

    async fn update_pipeline_data_store_configuration(
        &self,
        _org_id: i64,
        _: &DataStoreId,
        _: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError> {
        Err(PipelinePersistenceError::Database {
            reason: self.razon.clone(),
        }
        .into())
    }

    async fn delete_pipeline_data_store(
        &self,
        _org_id: i64,
        _: &DataStoreId,
    ) -> Result<(), IoTBeeError> {
        Err(PipelinePersistenceError::Database {
            reason: self.razon.clone(),
        }
        .into())
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn input_valido() -> PipelineDataStoreInputModel {
    let config = PipelineDataStoreModel::LocalLog(LocalLogConfig::new("test-log").unwrap());
    PipelineDataStoreInputModel::new("mi-store", config, "Descripción del store de prueba").unwrap()
}

// ─── Tests: get_data_store_by_id ─────────────────────────────────────────────

#[tokio::test]
async fn get_by_id_devuelve_not_found_cuando_repo_retorna_none() {
    let use_case = DataStoreUseCasesImpl::new(Arc::new(FakeRepoVacio));

    let resultado = use_case.get_data_store_by_id(TEST_ORG_ID, &5).await;

    assert!(resultado.is_err(), "Debe fallar cuando no hay datos");
    let mensaje = resultado.unwrap_err().to_string();
    assert!(
        mensaje.contains("not found") || mensaje.contains("not found"),
        "El error debe indicar que no se encontró el id. Fue: {mensaje}"
    );
}

#[tokio::test]
async fn get_by_id_devuelve_modelo_cuando_existe() {
    let use_case = DataStoreUseCasesImpl::new(Arc::new(FakeRepoConDatos));

    let resultado = use_case.get_data_store_by_id(TEST_ORG_ID, &1).await;

    assert!(resultado.is_ok());
    let modelo = resultado.unwrap();
    assert_eq!(modelo.name(), "store-ejemplo");
    assert_eq!(modelo.id(), 1);
}

#[tokio::test]
async fn get_by_id_propagra_error_del_repositorio() {
    let use_case = DataStoreUseCasesImpl::new(Arc::new(FakeRepoFallido {
        razon: "conexión caída".to_string(),
    }));

    let resultado = use_case.get_data_store_by_id(TEST_ORG_ID, &1).await;

    assert!(resultado.is_err());
}

// ─── Tests: create_data_store ─────────────────────────────────────────────────

#[tokio::test]
async fn create_data_store_retorna_ok_cuando_repo_acepta() {
    let use_case = DataStoreUseCasesImpl::new(Arc::new(FakeRepoVacio));

    let resultado = use_case
        .create_data_store(TEST_ORG_ID, &input_valido())
        .await;

    assert!(resultado.is_ok());
}

#[tokio::test]
async fn create_data_store_propagra_error_del_repositorio() {
    let use_case = DataStoreUseCasesImpl::new(Arc::new(FakeRepoFallido {
        razon: "bd no disponible".to_string(),
    }));

    let resultado = use_case
        .create_data_store(TEST_ORG_ID, &input_valido())
        .await;

    assert!(resultado.is_err());
    let mensaje = resultado.unwrap_err().to_string();
    assert!(
        mensaje.contains("bd no disponible"),
        "El mensaje de error debe incluir la razón del fallo. Fue: {mensaje}"
    );
}

// ─── Tests: get_data_store ────────────────────────────────────────────────────

#[tokio::test]
async fn get_data_store_retorna_lista_vacia_desde_repo_vacio() {
    let use_case = DataStoreUseCasesImpl::new(Arc::new(FakeRepoVacio));

    let resultado = use_case.get_data_store(TEST_ORG_ID).await;

    assert!(resultado.is_ok());
    assert!(resultado.unwrap().is_empty());
}

#[tokio::test]
async fn get_data_store_retorna_lista_con_elementos() {
    let use_case = DataStoreUseCasesImpl::new(Arc::new(FakeRepoConDatos));

    let resultado = use_case.get_data_store(TEST_ORG_ID).await;

    assert!(resultado.is_ok());
    let lista = resultado.unwrap();
    assert_eq!(lista.len(), 1);
    assert_eq!(lista[0].name(), "store-ejemplo");
}

#[tokio::test]
async fn get_data_store_propagra_error_del_repositorio() {
    let use_case = DataStoreUseCasesImpl::new(Arc::new(FakeRepoFallido {
        razon: "timeout".to_string(),
    }));

    let resultado = use_case.get_data_store(TEST_ORG_ID).await;

    assert!(resultado.is_err());
}
