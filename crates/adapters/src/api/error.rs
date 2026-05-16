use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use domain::error::{
    AuthError,
    IoTBeeError,
    LicenseError,
    PipelineLifecycleError,
    PipelinePersistenceError, // ya
};
use serde::Serialize;

#[derive(Serialize, utoipa::ToSchema)]
pub struct ErrorResponse {
    pub error: String,
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
            IoTBeeError::AuthError(inner) => match inner {
                AuthError::InvalidCredentials
                | AuthError::InvalidToken
                | AuthError::ExpiredToken => StatusCode::UNAUTHORIZED,
                AuthError::EmailAlreadyTaken { .. } => StatusCode::CONFLICT,
                AuthError::RegistrationDisabled => StatusCode::FORBIDDEN,
                AuthError::WeakPassword { .. } => StatusCode::BAD_REQUEST,
                AuthError::Internal { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            },
            IoTBeeError::LicenseError(inner) => match inner {
                LicenseError::LimitExceeded { .. } => StatusCode::PAYMENT_REQUIRED,
                LicenseError::Persistence { .. } => StatusCode::INTERNAL_SERVER_ERROR,
                LicenseError::InvalidKey
                | LicenseError::InvalidPlan { .. }
                | LicenseError::InvalidState { .. } => StatusCode::BAD_REQUEST,
            },
            IoTBeeError::AuditError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            IoTBeeError::SystemError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            IoTBeeError::UserAdminError(inner) => match inner {
                domain::error::UserAdminError::EmailTaken { .. } => StatusCode::CONFLICT,
                domain::error::UserAdminError::NotFound { .. } => StatusCode::NOT_FOUND,
                domain::error::UserAdminError::CannotDeactivateSelf
                | domain::error::UserAdminError::CannotChangeSelfRoleOrStatus
                | domain::error::UserAdminError::InvalidRole { .. }
                | domain::error::UserAdminError::InvalidStatus { .. }
                | domain::error::UserAdminError::WeakPassword { .. } => StatusCode::BAD_REQUEST,
                domain::error::UserAdminError::Internal { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            },
            IoTBeeError::OrganizationError(inner) => match inner {
                domain::error::OrganizationError::NotFound { .. } => StatusCode::NOT_FOUND,
                domain::error::OrganizationError::SlugTaken { .. } => StatusCode::CONFLICT,
                domain::error::OrganizationError::InvalidSlug { .. } => StatusCode::BAD_REQUEST,
                domain::error::OrganizationError::Internal { .. } => {
                    StatusCode::INTERNAL_SERVER_ERROR
                }
            },
            IoTBeeError::PlanError(inner) => match inner {
                domain::error::PlanError::NotFound { .. } => StatusCode::NOT_FOUND,
                domain::error::PlanError::SlugTaken { .. } => StatusCode::CONFLICT,
                domain::error::PlanError::Invalid { .. } => StatusCode::BAD_REQUEST,
                domain::error::PlanError::Internal { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            },
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
            IoTBeeError::AuthError(e) => {
                HttpResponse::build(self.status_code()).json(ErrorResponse {
                    error: e.to_string(),
                })
            }
            IoTBeeError::LicenseError(e) => {
                HttpResponse::build(self.status_code()).json(ErrorResponse {
                    error: e.to_string(),
                })
            }
            IoTBeeError::AuditError(e) => {
                HttpResponse::build(self.status_code()).json(ErrorResponse {
                    error: e.to_string(),
                })
            }
            IoTBeeError::SystemError(e) => {
                HttpResponse::build(self.status_code()).json(ErrorResponse {
                    error: e.to_string(),
                })
            }
            IoTBeeError::UserAdminError(e) => {
                HttpResponse::build(self.status_code()).json(ErrorResponse {
                    error: e.to_string(),
                })
            }
            IoTBeeError::OrganizationError(e) => {
                HttpResponse::build(self.status_code()).json(ErrorResponse {
                    error: e.to_string(),
                })
            }
            IoTBeeError::PlanError(e) => {
                HttpResponse::build(self.status_code()).json(ErrorResponse {
                    error: e.to_string(),
                })
            }
        }
    }
}
