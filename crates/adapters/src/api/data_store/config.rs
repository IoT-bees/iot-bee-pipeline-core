use domain::error::IoTBeeError;
use domain::value_objects::data_store_values::{
    InfluxDbConfig as DomainInfluxDbConfig, LocalLogConfig as DomainLocalLogConfig,
    PipelineDataStoreModel,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::{Validate, ValidationErrors};

// ---------------------------------------------------------------------------
// DTOs locales — contienen ToSchema y Validate sin contaminar el dominio
// ---------------------------------------------------------------------------

#[derive(Deserialize, Serialize, ToSchema, Validate)]
pub struct InfluxDbConfig {
    #[validate(length(min = 1))]
    pub url: String,
    #[validate(length(min = 1))]
    pub data_base: String,
    #[validate(length(min = 1))]
    pub measurement: String,
    #[validate(length(min = 1))]
    pub token: String,
    pub tag_fields: Vec<String>,
}

#[derive(Deserialize, Serialize, ToSchema, Validate)]
pub struct LocalLogConfig {
    #[validate(length(min = 1))]
    pub log_name: String,
}

// ---------------------------------------------------------------------------
// Enum discriminado — usa los DTOs locales
// ---------------------------------------------------------------------------

#[derive(Deserialize, Serialize, ToSchema)]
#[serde(tag = "persistenceType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DataStoreConfig {
    InfluxDb(InfluxDbConfig),
    LocalLog(LocalLogConfig),
}

impl Validate for DataStoreConfig {
    fn validate(&self) -> Result<(), ValidationErrors> {
        match self {
            DataStoreConfig::InfluxDb(cfg) => cfg.validate(),
            DataStoreConfig::LocalLog(cfg) => cfg.validate(),
        }
    }
}

// ---------------------------------------------------------------------------
// Conversión al tipo del dominio
// ---------------------------------------------------------------------------

impl TryFrom<DataStoreConfig> for PipelineDataStoreModel {
    type Error = IoTBeeError;

    fn try_from(config: DataStoreConfig) -> Result<Self, Self::Error> {
        match config {
            DataStoreConfig::InfluxDb(c) => Ok(PipelineDataStoreModel::InfluxDb(
                DomainInfluxDbConfig::new(c.url, c.data_base, c.measurement, c.token, c.tag_fields)?,
            )),
            DataStoreConfig::LocalLog(c) => Ok(PipelineDataStoreModel::LocalLog(
                DomainLocalLogConfig::new(c.log_name)?,
            )),
        }
    }
}
