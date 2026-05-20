/// Pruebas unitarias para los value objects del dominio.
/// Cubren las reglas de validación que protegen los invariantes del dominio.
use domain::value_objects::pipelines_values::{
    DataStoreId, DescriptionField, FieldName, PipelineStatus, ReplicationFactor,
};

// ─── DataStoreId ─────────────────────────────────────────────────────────────

#[test]
fn data_store_id_rechaza_cero() {
    assert!(DataStoreId::new(0).is_err(), "ID 0 debe ser inválido");
}

#[test]
fn data_store_id_acepta_uno() {
    let id = DataStoreId::new(1).expect("ID 1 debe ser válido");
    assert_eq!(id.id(), 1);
}

#[test]
fn data_store_id_preserva_valor() {
    let id = DataStoreId::new(42).unwrap();
    assert_eq!(id.id(), 42);
}

// ─── FieldName ───────────────────────────────────────────────────────────────

#[test]
fn field_name_rechaza_cadena_vacia() {
    assert!(FieldName::new("").is_err());
}

#[test]
fn field_name_rechaza_solo_espacios() {
    assert!(FieldName::new("   ").is_err());
}

#[test]
fn field_name_acepta_nombre_valido() {
    let name = FieldName::new("sensor-temperatura").unwrap();
    assert_eq!(name.name(), "sensor-temperatura");
}

// ─── DescriptionField ────────────────────────────────────────────────────────

#[test]
fn description_rechaza_cadena_vacia() {
    assert!(DescriptionField::new("").is_err());
}

#[test]
fn description_rechaza_solo_espacios() {
    assert!(DescriptionField::new("   ").is_err());
}

#[test]
fn description_acepta_texto_valido() {
    let desc = DescriptionField::new("Almacén principal de datos IoT").unwrap();
    assert_eq!(desc.description(), "Almacén principal de datos IoT");
}

// ─── PipelineStatus ──────────────────────────────────────────────────────────

#[test]
fn pipeline_status_running_es_valido() {
    let s = PipelineStatus::new(0).unwrap();
    assert_eq!(s.status(), 0);
}

#[test]
fn pipeline_status_stopped_es_valido() {
    let s = PipelineStatus::new(1).unwrap();
    assert_eq!(s.status(), 1);
}

#[test]
fn pipeline_status_pending_es_valido() {
    let s = PipelineStatus::new(2).unwrap();
    assert_eq!(s.status(), 2);
}

#[test]
fn pipeline_status_failed_es_valido() {
    let s = PipelineStatus::new(3).unwrap();
    assert_eq!(s.status(), 3);
}

#[test]
fn pipeline_status_rechaza_valor_fuera_de_rango() {
    assert!(PipelineStatus::new(4).is_err());
    assert!(PipelineStatus::new(99).is_err());
}

// ─── ReplicationFactor ───────────────────────────────────────────────────────

#[test]
fn replication_factor_rechaza_cero() {
    assert!(ReplicationFactor::new(0).is_err());
}

#[test]
fn replication_factor_rechaza_mayor_de_cincuenta() {
    assert!(ReplicationFactor::new(51).is_err());
    assert!(ReplicationFactor::new(100).is_err());
}

#[test]
fn replication_factor_acepta_limite_inferior() {
    let rf = ReplicationFactor::new(1).unwrap();
    assert_eq!(rf.replication_factor(), 1);
}

#[test]
fn replication_factor_acepta_limite_superior() {
    let rf = ReplicationFactor::new(50).unwrap();
    assert_eq!(rf.replication_factor(), 50);
}

#[test]
fn replication_factor_acepta_valor_intermedio() {
    assert_eq!(ReplicationFactor::new(10).unwrap().replication_factor(), 10);
}
