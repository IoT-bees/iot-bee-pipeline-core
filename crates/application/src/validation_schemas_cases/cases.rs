use async_trait::async_trait;
use domain::entities::validation_schema::{
    PipelineNewValidateSchema, PipelineValidationSchemaModel,
};
use domain::error::{IoTBeeError, PipelinePersistenceError};
use domain::outbound::pipeline_persistence::PipelineValidationSchemaRepository;
use domain::value_objects::pipelines_values::DataStoreId;
use logging::AppLogger;
use std::sync::Arc;

static LOGGER: AppLogger = AppLogger::new("iot_bee::application::validation_schemas_cases::cases");

#[async_trait]
pub trait SchemaValidationUseCases {
    async fn create_validation_schema(&self, name: &str, schema: &str) -> Result<(), IoTBeeError>;

    async fn update_validation_schema(
        &self,
        schema_id: u32,
        new_schema: &str,
    ) -> Result<(), IoTBeeError>;

    async fn update_validation_schema_name(
        &self,
        schema_id: u32,
        new_name: &str,
    ) -> Result<(), IoTBeeError>;

    async fn get_validation_schema(
        &self,
    ) -> Result<Vec<PipelineValidationSchemaModel>, IoTBeeError>;

    async fn get_validation_schema_by_id(
        &self,
        id: u32,
    ) -> Result<PipelineNewValidateSchema, IoTBeeError>;
    async fn delete_validation_schema(&self, id: u32) -> Result<(), IoTBeeError>;
}

pub struct SchemaValidationUseCasesImpl<T: PipelineValidationSchemaRepository + Send + Sync> {
    repository: Arc<T>,
}

impl<T: PipelineValidationSchemaRepository + Send + Sync> SchemaValidationUseCasesImpl<T> {
    pub fn new(repository: Arc<T>) -> Self {
        Self { repository }
    }
}

#[async_trait]
impl<T> SchemaValidationUseCases for SchemaValidationUseCasesImpl<T>
where
    T: PipelineValidationSchemaRepository + Send + Sync,
{
    async fn create_validation_schema(&self, name: &str, schema: &str) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "create_validation_schema use case called for name='{name}'"
        ));

        let domain_schema = PipelineNewValidateSchema::new(name, schema)?;
        self.repository
            .save_pipeline_validation_schema(&domain_schema)
            .await
            .map_err(|e| {
                LOGGER.error(&format!("Failed to save validation schema '{name}': {e}"));
                e
            })?;

        LOGGER.info(&format!("Validation schema '{name}' created successfully"));
        Ok(())
    }

    async fn get_validation_schema(
        &self,
    ) -> Result<Vec<PipelineValidationSchemaModel>, IoTBeeError> {
        LOGGER.debug("get_validation_schema use case called");
        let result = self
            .repository
            .list_pipeline_validation_schema()
            .await
            .map_err(|e| {
                LOGGER.error(&format!("Failed to list validation schemas: {e}"));
                e
            })?;
        LOGGER.info(&format!("Found {} validation schemas", result.len()));
        Ok(result)
    }

    async fn get_validation_schema_by_id(
        &self,
        id: u32,
    ) -> Result<PipelineNewValidateSchema, IoTBeeError> {
        LOGGER.debug(&format!(
            "get_validation_schema_by_id use case called for id={id}"
        ));

        let id_to_search = DataStoreId::new(id)?;
        let result = self
            .repository
            .get_pipeline_validation_schema(&id_to_search)
            .await
            .map_err(|e| {
                LOGGER.error(&format!("Failed to get validation schema id={id}: {e}"));
                e
            })?;

        if result.is_none() {
            LOGGER.warn(&format!("Validation schema id={id} not found"));
            return Err(PipelinePersistenceError::IdNotFound {
                id: id_to_search.id(),
            }
            .into());
        }
        Ok(result.unwrap())
    }

    async fn update_validation_schema_name(
        &self,
        schema_id: u32,
        new_name: &str,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_validation_schema_name use case called for id={schema_id}"
        ));

        let id_to_search = DataStoreId::new(schema_id)?;
        let result = self
            .repository
            .get_pipeline_validation_schema(&id_to_search)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to fetch schema id={schema_id} before name update: {e}"
                ));
                e
            })?;
        if result.is_none() {
            LOGGER.warn(&format!(
                "Validation schema id={schema_id} not found for name update"
            ));
            return Err(PipelinePersistenceError::ValidationSchemaNotFound {
                schema_id: schema_id.to_string(),
            }
            .into());
        }
        self.repository
            .update_pipeline_validation_schema_name(&id_to_search, new_name)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update schema name for id={schema_id}: {e}"
                ));
                e
            })?;

        LOGGER.info(&format!(
            "Validation schema id={schema_id} name updated to '{new_name}'"
        ));
        Ok(())
    }

    async fn update_validation_schema(
        &self,
        schema_id: u32,
        new_schema: &str,
    ) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "update_validation_schema use case called for id={schema_id}"
        ));

        let id_to_search = DataStoreId::new(schema_id)?;
        let result = self
            .repository
            .get_pipeline_validation_schema(&id_to_search)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to fetch schema id={schema_id} before json update: {e}"
                ));
                e
            })?;
        if result.is_none() {
            LOGGER.warn(&format!(
                "Validation schema id={schema_id} not found for json update"
            ));
            return Err(IoTBeeError::from(
                PipelinePersistenceError::ValidationSchemaNotFound {
                    schema_id: schema_id.to_string(),
                },
            ));
        }
        let new_schema = PipelineNewValidateSchema::new("", new_schema)?;
        self.repository
            .update_pipeline_validation_schema(&id_to_search, &new_schema)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to update schema json for id={schema_id}: {e}"
                ));
                e
            })?;

        LOGGER.info(&format!(
            "Validation schema id={schema_id} JSON updated successfully"
        ));
        //TODO: Realizar el reinicio de los pipelines que utilizan este schema de validación, para que tomen el nuevo schema actualizado
        Ok(())
    }

    async fn delete_validation_schema(&self, id: u32) -> Result<(), IoTBeeError> {
        LOGGER.debug(&format!(
            "delete_validation_schema use case called for id={id}"
        ));
        let id_to_delete = DataStoreId::new(id)?;

        let pipeline_using_schema = self
            .repository
            .get_pipelines_using_validation_schema(&id_to_delete)
            .await
            .map_err(|e| {
                LOGGER.error(&format!(
                    "Failed to check pipelines using schema id={id} before deletion: {e}"
                ));
                e
            })?;

        if !pipeline_using_schema.is_empty() {
            LOGGER.warn(&format!(
                "Cannot delete validation schema id={id} because it is used by pipelines: {:?}",
                pipeline_using_schema
                    .iter()
                    .map(|ds| ds.id())
                    .collect::<Vec<_>>()
            ));
            return Err(PipelinePersistenceError::DeleteFailed {
                reason: format!(
                    "Cannot delete validation schema id={id} because it is used by pipelines: {:?}",
                    pipeline_using_schema
                        .iter()
                        .map(|ds| ds.id())
                        .collect::<Vec<_>>()
                ),
            }
            .into());
        }

        self.repository
            .delete_pipeline_validation_schema(&id_to_delete)
            .await
            .map_err(|e| {
                LOGGER.error(&format!("Failed to delete validation schema id={id}: {e}"));
                e
            })?;

        LOGGER.info(&format!("Validation schema id={id} deleted successfully"));
        Ok(())
    }
}
