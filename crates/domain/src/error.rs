use thiserror::Error;

pub type DomainResult<T> = Result<T, IoTBeeError>;

#[derive(Error, Debug)]
pub enum PipelineError {
    #[error("Pipeline name is invalid")]
    InvalidName,
    #[error("Pipeline configuration is invalid")]
    InvalidConfig,
    #[error("data with id {pipeline_id} does not exist")]
    NotFound { pipeline_id: String },
}

#[derive(Error, Debug)]
pub enum PipelineLifecycleError {
    #[error("Pipeline with id {pipeline_id} is already running")]
    AlreadyRunning { pipeline_id: String },
    #[error("Pipeline with id {pipeline_id} is already stopped")]
    AlreadyStopped { pipeline_id: String },
    #[error("Lifecycle operation failed: {reason}")]
    OperationFailed { reason: String },
    #[error("Pipeline with id {pipeline_id} not found")]
    NotFound { pipeline_id: String },
    #[error("Internal communication error: {reason}")]
    InternalCommunication { reason: String },
}

#[derive(Error, Debug)]
pub enum DataSourceError {
    #[error("Data source connection failed: {reason}")]
    ConnectionFailed { reason: String },
    #[error("Data source timeout")]
    Timeout,
    #[error("Could not decode payload: {reason}")]
    InvalidPayload { reason: String },
}

#[derive(Error, Debug, Clone)]
pub enum PipelinePersistenceError {
    #[error("Data could not be persisted: {reason}")]
    SaveFailed { reason: String },
    #[error("Data could not be updated: {reason}")]
    UpdateFailed { reason: String },
    #[error("Data could not be deleted: {reason}")]
    DeleteFailed { reason: String },
    #[error("Failed to parse data: {reason}")]
    ParseError { reason: String },
    #[error("Validation schema with name {name} already exists")]
    ValidationSchemaNameExists { name: String },
    #[error("Invalid data for validation schema: {reason}")]
    InvalidData { reason: String },
    #[error("Validation schema with id {schema_id} not found")]
    ValidationSchemaNotFound { schema_id: String },
    #[error("Operation with id {id} not found")]
    IdNotFound { id: u32 },
    #[error("Database operation failed: {reason}")]
    Database { reason: String },
}

#[derive(Error, Debug)]
pub enum DomainValidationError {
    #[error("Validation failed: {reason}")]
    ValidationFailed { reason: String },
    #[error("Invalid field value for {field_name}: {reason}")]
    InvalidFieldValue { field_name: String, reason: String },
    #[error("Missing required field: {field_name}")]
    MissingField { field_name: String },
    #[error("Data format error: {reason}")]
    DataFormatError { reason: String },
}

// define a proper domain error for all my sistem
#[derive(Error, Debug)]
pub enum IoTBeeError {
    #[error("Pipeline error: {0}")]
    PipelineError(#[from] PipelineError),
    #[error("Pipeline lifecycle error: {0}")]
    PipelineLifecycleError(#[from] PipelineLifecycleError),
    #[error("Data source error: {0}")]
    DataSourceError(#[from] DataSourceError),
    #[error("Persistence error: {0}")]
    PipelinePersistenceError(#[from] PipelinePersistenceError),
    #[error("Domain validation error: {0}")]
    DomainValidationError(#[from] DomainValidationError),
}
