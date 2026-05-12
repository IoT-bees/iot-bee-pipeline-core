use super::influxdb_persistence::InfluxDbPersistence;
use domain::outbound::data_external_store::DataExternalStore;
use domain::value_objects::data_store_values::PipelineDataStoreModel;
use std::error::Error;
use std::sync::Arc;

pub struct ExternalPersistenceFactory;

impl ExternalPersistenceFactory {
    pub fn create_external_persistence(
        config: &PipelineDataStoreModel,
    ) -> Result<Arc<dyn DataExternalStore + Send + Sync>, Box<dyn Error>> {
        match config {
            PipelineDataStoreModel::InfluxDb(influxdb_config) => {
                Ok(Arc::new(InfluxDbPersistence::new(influxdb_config)))
            }
            PipelineDataStoreModel::LocalLog(_) => {
                Err("LocalLog persistence is not yet implemented".into())
            }
        }
    }
}
