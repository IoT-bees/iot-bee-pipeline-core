use super::{
    influxdb_persistence::{InfluxDbPersistence, InfluxDbStoreConfig},
};
use domain::value_objects::pipelines_values::ExternalPersistenceType;
use domain::outbound::data_external_store::DataExternalStore;
use serde_json;
use std::error::Error;
use std::sync::Arc;

pub struct ExternalPersistenceFactory;

impl ExternalPersistenceFactory {
    pub fn create_external_persistence(
        persistence_type: ExternalPersistenceType,
        config: impl Into<String>,
    ) -> Result<Arc<dyn DataExternalStore + Send + Sync>, Box<dyn Error>> {
        match persistence_type {
            ExternalPersistenceType::InfluxDb => {
                let influxdb_config: InfluxDbStoreConfig =
                    serde_json::from_str(config.into().as_str())?;

                Ok(Arc::new(InfluxDbPersistence::new(influxdb_config)))
            }
        }
    }
}
