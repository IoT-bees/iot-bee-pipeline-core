use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use domain::error::{
    IoTBeeError,
    PipelineLifecycleError,
    PipelinePersistenceError, // ya
};
use serde::Serialize;

#[derive(Serialize, utoipa::ToSchema)]
pub struct ErrorResponse {
    error: String,
}
use std::fmt;

#[derive(Debug)]
pub struct PersistenceError(pub PipelinePersistenceError);
#[derive(Debug)]
pub struct LifecycleError(pub PipelineLifecycleError);
#[derive(Debug)]
pub struct ApiError(pub IoTBeeError);

impl From<IoTBeeError> for ApiError {
    fn from(error: IoTBeeError) -> Self {
        ApiError(error)
    }
}

impl From<PipelinePersistenceError> for ApiError {
    fn from(error: PipelinePersistenceError) -> Self {
        ApiError(IoTBeeError::PipelinePersistenceError(error))
    }
}

impl From<PipelineLifecycleError> for ApiError {
    fn from(error: PipelineLifecycleError) -> Self {
        ApiError(IoTBeeError::PipelineLifecycleError(error))
    }
}

impl fmt::Display for PersistenceError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl fmt::Display for LifecycleError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl ResponseError for PersistenceError {
    fn status_code(&self) -> StatusCode {
        match &self.0 {
            PipelinePersistenceError::ValidationSchemaNameExists { .. } => StatusCode::CONFLICT, // 409
            PipelinePersistenceError::IdNotFound { .. }
            | PipelinePersistenceError::ValidationSchemaNotFound { .. } => StatusCode::NOT_FOUND, // 404
            PipelinePersistenceError::Database { .. } => StatusCode::INTERNAL_SERVER_ERROR, // 500
            PipelinePersistenceError::SaveFailed { .. }
            | PipelinePersistenceError::UpdateFailed { .. }
            | PipelinePersistenceError::InvalidData { .. }
            | PipelinePersistenceError::DeleteFailed { .. } => StatusCode::BAD_REQUEST,
            PipelinePersistenceError::ParseError { .. } => StatusCode::BAD_REQUEST,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let status = self.status_code();
        let body = match &self.0 {
            PipelinePersistenceError::ValidationSchemaNameExists { name } => {
                format!("Validation schema with name '{}' already exists", name)
            }
            PipelinePersistenceError::ValidationSchemaNotFound { schema_id } => {
                format!("Validation schema with id '{}' not found", schema_id)
            }
            PipelinePersistenceError::IdNotFound { id } => {
                format!("Operation with id '{}' not found", id)
            }
            PipelinePersistenceError::Database { .. } => "Internal server error".to_string(),
            PipelinePersistenceError::SaveFailed { reason }
            | PipelinePersistenceError::UpdateFailed { reason }
            | PipelinePersistenceError::DeleteFailed { reason }
            | PipelinePersistenceError::ParseError { reason }
            | PipelinePersistenceError::InvalidData { reason } => reason.clone(),
        };

        HttpResponse::build(status).json(ErrorResponse { error: body })
    }
}

impl ResponseError for LifecycleError {
    fn status_code(&self) -> StatusCode {
        match &self.0 {
            PipelineLifecycleError::NotFound { .. } => StatusCode::NOT_FOUND,
            PipelineLifecycleError::OperationFailed { .. } => StatusCode::BAD_REQUEST,
            PipelineLifecycleError::InternalCommunication { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            PipelineLifecycleError::AlreadyStopped { .. }
            | PipelineLifecycleError::AlreadyRunning { .. } => StatusCode::CONFLICT,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let status = self.status_code();
        let body = match &self.0 {
            PipelineLifecycleError::NotFound { pipeline_id } => {
                format!("Pipeline with id '{}' not found", pipeline_id)
            }
            PipelineLifecycleError::OperationFailed { reason } => reason.clone(),
            PipelineLifecycleError::InternalCommunication { .. } => {
                "Internal server error".to_string()
            }
            PipelineLifecycleError::AlreadyStopped { pipeline_id } => {
                format!("Pipeline with id '{}' is already stopped", pipeline_id)
            }
            PipelineLifecycleError::AlreadyRunning { pipeline_id } => {
                format!("Pipeline with id '{}' is already running", pipeline_id)
            }
        };

        HttpResponse::build(status).json(ErrorResponse { error: body })
    }
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        match &self.0 {
            IoTBeeError::PipelinePersistenceError(inner) => {
                PersistenceError(inner.clone()).status_code()
            }
            IoTBeeError::PipelineError(_) => StatusCode::BAD_REQUEST,
            IoTBeeError::PipelineLifecycleError(inner) => {
                LifecycleError(inner.clone()).status_code()
            }
            IoTBeeError::DataSourceError(_) => StatusCode::BAD_REQUEST,
            IoTBeeError::DomainValidationError(_) => StatusCode::BAD_REQUEST,
            IoTBeeError::DataExternalStoreError(_) => StatusCode::BAD_REQUEST,
        }
    }

    fn error_response(&self) -> HttpResponse {
        match &self.0 {
            IoTBeeError::PipelinePersistenceError(inner) => {
                PersistenceError(inner.clone()).error_response()
            }
            IoTBeeError::PipelineError(e) => {
                HttpResponse::build(StatusCode::BAD_REQUEST).json(ErrorResponse {
                    error: format!("Pipeline error: {}", e),
                })
            }
            IoTBeeError::PipelineLifecycleError(e) => HttpResponse::build(StatusCode::BAD_REQUEST)
                .json(ErrorResponse {
                    error: format!("Lifecycle error: {}", e),
                }),
            IoTBeeError::DataSourceError(e) => {
                HttpResponse::build(StatusCode::BAD_REQUEST).json(ErrorResponse {
                    error: format!("Data source error: {}", e),
                })
            }
            IoTBeeError::DomainValidationError(e) => HttpResponse::build(StatusCode::BAD_REQUEST)
                .json(ErrorResponse {
                    error: format!("Data validation error: {}", e),
                }),
            IoTBeeError::DataExternalStoreError(e) => HttpResponse::build(StatusCode::BAD_REQUEST)
                .json(ErrorResponse {
                    error: format!("External store error: {}", e),
                }),
        }
    }
}
