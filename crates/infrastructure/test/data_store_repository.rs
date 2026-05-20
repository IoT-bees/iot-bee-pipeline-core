/// Pruebas de integración del repositorio SQLite.
/// Usan una base de datos en memoria para verificar el SQL real,
/// los constraints (UNIQUE, FK) y el mapeo de filas a entidades.
use domain::entities::data_store::PipelineDataStoreInputModel;
use domain::outbound::pipeline_persistence::PipelineDataStoreRepository;
use domain::value_objects::pipelines_values::DataStoreId;
use crate::persistence::connection::InternalDataBase;
use crate::persistence::repositories::data_store_repository::DataStoreRepository;
use std::sync::Arc;
use uuid::Uuid;

// ─── Setup ───────────────────────────────────────────────────────────────────

/// Crea una base de datos SQLite en memoria con un nombre único por ejecución
/// de test para evitar colisiones entre tests paralelos.
/// La tabla `databases` se crea con el esquema que usa `DataStoreRepository`.
async fn crear_bd_test() -> Arc<InternalDataBase> {
    let nombre_unico = Uuid::new_v4().to_string().replace('-', "");
    let url = format!("sqlite:file:{}?mode=memory&cache=shared", nombre_unico);

    let db = InternalDataBase::new(&url)
        .await
        .expect("Error al crear la BD de prueba en memoria");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS databases (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE,
            type        INTEGER NOT NULL,
            json_schema TEXT    NOT NULL,
            description TEXT    NOT NULL,
            created_at  TEXT    NOT NULL,
            updated_at  TEXT    NOT NULL
        )
        "#,
    )
    .execute(db.pool())
    .await
    .expect("Error al crear la tabla databases en la BD de prueba");

    Arc::new(db)
}

fn input(nombre: &str) -> PipelineDataStoreInputModel {
    PipelineDataStoreInputModel::new(
        nombre,
        1,
        r#"{"host":"localhost","port":5432}"#,
        "Descripción del store de integración",
    )
    .unwrap()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[tokio::test]
async fn save_y_get_all_retorna_el_registro_guardado() {
    let db = crear_bd_test().await;
    let repo = DataStoreRepository::new(db);

    repo.save_pipeline_data_store(&input("store-integracion"))
        .await
        .expect("Debe guardar sin error");

    let lista = repo
        .get_pipeline_data_store()
        .await
        .expect("Debe listar sin error");

    assert_eq!(lista.len(), 1);
    assert_eq!(lista[0].name(), "store-integracion");
    assert_eq!(lista[0].type_id(), 1);
}

#[tokio::test]
async fn get_all_retorna_lista_vacia_en_bd_nueva() {
    let db = crear_bd_test().await;
    let repo = DataStoreRepository::new(db);

    let lista = repo
        .get_pipeline_data_store()
        .await
        .expect("Debe listar sin error");

    assert!(lista.is_empty());
}

#[tokio::test]
async fn get_by_id_retorna_none_cuando_no_existe() {
    let db = crear_bd_test().await;
    let repo = DataStoreRepository::new(db);

    let id = DataStoreId::new(99).unwrap();
    let resultado = repo
        .get_pipeline_data_store_by_id(&id)
        .await
        .expect("La consulta no debe fallar");

    assert!(resultado.is_none());
}

#[tokio::test]
async fn get_by_id_retorna_el_registro_guardado() {
    let db = crear_bd_test().await;
    let repo = DataStoreRepository::new(db);

    repo.save_pipeline_data_store(&input("store-por-id"))
        .await
        .unwrap();

    let lista = repo.get_pipeline_data_store().await.unwrap();
    let id_guardado = lista[0].id();

    let id_vo = DataStoreId::new(id_guardado).unwrap();
    let resultado = repo.get_pipeline_data_store_by_id(&id_vo).await.unwrap();

    assert!(resultado.is_some());
    let modelo = resultado.unwrap();
    assert_eq!(modelo.name(), "store-por-id");
    assert_eq!(modelo.id(), id_guardado);
}

#[tokio::test]
async fn save_nombre_duplicado_retorna_error() {
    let db = crear_bd_test().await;
    let repo = DataStoreRepository::new(db);

    repo.save_pipeline_data_store(&input("store-duplicado"))
        .await
        .expect("Primera inserción debe funcionar");

    let resultado = repo
        .save_pipeline_data_store(&input("store-duplicado"))
        .await;

    assert!(
        resultado.is_err(),
        "Insertar nombre duplicado debe fallar por constraint UNIQUE"
    );
}

#[tokio::test]
async fn save_multiples_stores_y_listar_todos() {
    let db = crear_bd_test().await;
    let repo = DataStoreRepository::new(db);

    repo.save_pipeline_data_store(&input("store-a"))
        .await
        .unwrap();
    repo.save_pipeline_data_store(&input("store-b"))
        .await
        .unwrap();
    repo.save_pipeline_data_store(&input("store-c"))
        .await
        .unwrap();

    let lista = repo.get_pipeline_data_store().await.unwrap();

    assert_eq!(lista.len(), 3);
    let nombres: Vec<&str> = lista.iter().map(|s| s.name()).collect();
    assert!(nombres.contains(&"store-a"));
    assert!(nombres.contains(&"store-b"));
    assert!(nombres.contains(&"store-c"));
}
