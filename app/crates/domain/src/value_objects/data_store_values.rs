use crate::error::{DomainValidationError, IoTBeeError};
use serde::{Deserialize, Serialize};

pub enum DataStoreType {
    InfluxDb,
    LocalLog,
    Webhook,
}

impl TryFrom<&str> for DataStoreType {
    type Error = IoTBeeError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.to_uppercase().as_str() {
            "INFLUX_DB" => Ok(DataStoreType::InfluxDb),
            "LOCAL_LOG" => Ok(DataStoreType::LocalLog),
            "WEBHOOK" => Ok(DataStoreType::Webhook),
            _ => Err(DomainValidationError::InvalidFieldValue {
                field_name: "DataStoreType".to_string(),
                reason: "Invalid data store type".to_string(),
            }
            .into()),
        }
    }
}

impl From<DataStoreType> for String {
    fn from(value: DataStoreType) -> Self {
        match value {
            DataStoreType::InfluxDb => "INFLUX_DB".to_string(),
            DataStoreType::LocalLog => "LOCAL_LOG".to_string(),
            DataStoreType::Webhook => "WEBHOOK".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "persistenceType", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PipelineDataStoreModel {
    InfluxDb(InfluxDbConfig),
    LocalLog(LocalLogConfig),
    Webhook(WebhookConfig),
}

impl PipelineDataStoreModel {
    pub fn store_type(&self) -> DataStoreType {
        match self {
            Self::InfluxDb(_) => DataStoreType::InfluxDb,
            Self::LocalLog(_) => DataStoreType::LocalLog,
            Self::Webhook(_) => DataStoreType::Webhook,
        }
    }

    pub fn store_type_id(&self) -> u32 {
        match self {
            Self::InfluxDb(_) => 1,
            Self::LocalLog(_) => 2,
            Self::Webhook(_) => 3,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookConfig {
    url: String,
    bearer_token: Option<String>,
}

impl WebhookConfig {
    pub fn new(url: impl Into<String>, bearer_token: Option<String>) -> Result<Self, IoTBeeError> {
        let url = url.into();
        if url.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "url".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }

        let bearer_token = bearer_token.filter(|token| !token.trim().is_empty());

        Ok(Self { url, bearer_token })
    }

    pub fn url(&self) -> &str {
        &self.url
    }

    pub fn bearer_token(&self) -> Option<&str> {
        self.bearer_token.as_deref()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalLogConfig {
    log_name: String,
}
impl LocalLogConfig {
    pub fn new(log_name: impl Into<String>) -> Result<Self, IoTBeeError> {
        let log_name = log_name.into();
        if log_name.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "log_name".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        Ok(Self { log_name })
    }

    pub fn log_name(&self) -> &str {
        &self.log_name
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InfluxDbConfig {
    url: String,
    data_base: String,
    measurement: String,
    token: String,
    tag_fields: Vec<String>,
}
impl InfluxDbConfig {
    pub fn new(
        url: impl Into<String>,
        data_base: impl Into<String>,
        measurement: impl Into<String>,
        token: impl Into<String>,
        tag_fields: Vec<String>,
    ) -> Result<Self, IoTBeeError> {
        let url = url.into();
        let data_base = data_base.into();
        let measurement = measurement.into();
        let token = token.into();

        if url.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "url".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if data_base.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "data_base".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if measurement.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "measurement".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }
        if token.is_empty() {
            return Err(DomainValidationError::InvalidFieldValue {
                field_name: "token".to_string(),
                reason: "must not be empty".to_string(),
            }
            .into());
        }

        Ok(Self {
            url,
            data_base,
            measurement,
            token,
            tag_fields,
        })
    }

    pub fn url(&self) -> &str {
        &self.url
    }
    pub fn data_base(&self) -> &str {
        &self.data_base
    }
    pub fn measurement(&self) -> &str {
        &self.measurement
    }
    pub fn token(&self) -> &str {
        &self.token
    }
    pub fn tag_fields(&self) -> &[String] {
        &self.tag_fields
    }
}
