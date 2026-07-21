use domain::error::{IoTBeeError, PipelinePersistenceError};

/// Convierte el identificador público del dominio al tipo de almacenamiento.
pub(crate) fn pipeline_id_to_database(id: u32) -> i64 {
    i64::from(id)
}

/// Rechaza datos que no cabrían en el contrato público actual.
pub(crate) fn database_id_to_pipeline(id: i64) -> Result<u32, IoTBeeError> {
    u32::try_from(id).map_err(|_| {
        PipelinePersistenceError::InvalidData {
            reason: format!("identificador fuera del rango público: {id}"),
        }
        .into()
    })
}

pub(crate) fn replication_to_database(value: u32) -> Result<i32, IoTBeeError> {
    i32::try_from(value).map_err(|_| {
        PipelinePersistenceError::InvalidData {
            reason: format!("factor de replicación fuera del rango: {value}"),
        }
        .into()
    })
}
