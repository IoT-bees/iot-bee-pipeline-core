use crate::error::IoTBeeError;
use crate::value_objects::pipelines_values::DataStoreId;

pub struct ConnectionTypeModel {
    connection_type_id: DataStoreId,
    connection_type: String,
}

impl ConnectionTypeModel {
    pub fn new(
        connection_type: impl Into<String>,
        connection_type_id: u32,
    ) -> Result<Self, IoTBeeError> {
        Ok(ConnectionTypeModel {
            connection_type_id: DataStoreId::new(connection_type_id)?,
            connection_type: connection_type.into(),
        })
    }
    pub fn id(&self) -> u32 {
        self.connection_type_id.id()
    }
    pub fn connection_type(&self) -> &str {
        &self.connection_type
    }
}
