// Domain errors imports
use crate::error::IoTBeeError;
// Domain entities imports
use crate::entities::connection_type::ConnectionTypeModel;
use crate::entities::data_source::{
    PipelineDataSourceInputModel, PipelineDataSourceOutputModel, PipelineDataSourceUpdateModel,
};
use crate::entities::data_store::{PipelineDataStoreInputModel, PipelineDataStoreOutputModel};
use crate::entities::pipeline_data::{PipelineDataInputModel, PipelineDataOutputModel};
use crate::entities::pipeline_groups::{PipelineGroupInputModel, PipelineGroupOutputModel};
use crate::entities::validation_schema::{
    PipelineNewValidateSchema, PipelineValidationSchemaModel,
};

// Domain value objects imports
use crate::value_objects::pipelines_values::{DataStoreId, FieldName};
//general imports
use async_trait::async_trait;

// // these methods are for the data source
#[async_trait]
pub trait PipelineDataSourceRepository {
    async fn save_pipeline_data_source(
        &self,
        data_source: &PipelineDataSourceInputModel,
    ) -> Result<(), IoTBeeError>;
    async fn get_pipeline_data_source(
        &self,
        data_source_id: &DataStoreId,
    ) -> Result<Option<PipelineDataSourceOutputModel>, IoTBeeError>;
    async fn list_pipeline_data_source(
        &self,
    ) -> Result<Vec<PipelineDataSourceOutputModel>, IoTBeeError>;

    async fn update_pipeline_data_source(
        &self,
        data_source_id: &DataStoreId,
        data_source: &PipelineDataSourceUpdateModel,
    ) -> Result<(), IoTBeeError>;
    async fn update_pipeline_data_source_name(
        &self,
        data_source_id: &DataStoreId,
        name: &FieldName,
    ) -> Result<(), IoTBeeError>;
    async fn delete_pipeline_data_source(
        &self,
        data_source_id: &DataStoreId,
    ) -> Result<(), IoTBeeError>;
    async fn get_pipelines_using_data_source(
        &self,
        data_source_id: &DataStoreId,
    ) -> Result<Vec<DataStoreId>, IoTBeeError>;
}

// // these methods are for the data store
// #[async_trait]
// pub trait PipelineDataStoreRepository {
// async fn save_pipeline_data_store(&self, data_store: &String) -> Result<(), IoTBeeError>;
// async fn delete_pipeline_data_store();
// async fn update_pipeline_data_store();
// async fn get_pipeline_data_store();
// async fn list_pipeline_data_store();
// }

#[async_trait]
pub trait PipelineGroupRepository {
    async fn get_pipeline_group(&self) -> Result<Vec<PipelineGroupOutputModel>, IoTBeeError>;
    async fn get_pipeline_group_by_id(
        &self,
        group_id: &DataStoreId,
    ) -> Result<Option<PipelineGroupOutputModel>, IoTBeeError>;
    async fn save_pipeline_group(&self, group: &PipelineGroupInputModel)
    -> Result<(), IoTBeeError>;
    //TODO: add update and delete methods for the pipeline group
    async fn delete_pipeline_group(&self, group_id: &DataStoreId) -> Result<(), IoTBeeError>;
    async fn get_pipelines_using_group(
        &self,
        group_id: &DataStoreId,
    ) -> Result<Vec<DataStoreId>, IoTBeeError>;
}

#[async_trait]
pub trait PipelineValidationSchemaRepository {
    // these methods are for the validation schema
    async fn save_pipeline_validation_schema(
        &self,
        schema: &PipelineNewValidateSchema,
    ) -> Result<(), IoTBeeError>;
    async fn delete_pipeline_validation_schema(
        &self,
        schema_id: &DataStoreId,
    ) -> Result<(), IoTBeeError>;
    async fn update_pipeline_validation_schema(
        &self,
        schema_id: &DataStoreId,
        schema: &PipelineNewValidateSchema,
    ) -> Result<(), IoTBeeError>;
    async fn update_pipeline_validation_schema_name(
        &self,
        schema_id: &DataStoreId,
        new_name: &str,
    ) -> Result<(), IoTBeeError>;
    async fn get_pipeline_validation_schema(
        &self,
        schema_id: &DataStoreId,
    ) -> Result<Option<PipelineNewValidateSchema>, IoTBeeError>;
    async fn list_pipeline_validation_schema(
        &self,
    ) -> Result<Vec<PipelineValidationSchemaModel>, IoTBeeError>;
    async fn get_pipelines_using_validation_schema(
        &self,
        schema_id: &DataStoreId,
    ) -> Result<Vec<DataStoreId>, IoTBeeError>;
}

#[async_trait]
pub trait PipelineConnectionTypeRepository {
    async fn get_pipeline_connection_type(&self) -> Result<Vec<ConnectionTypeModel>, IoTBeeError>;
}

#[async_trait]
pub trait PipelineDataStoreRepository {
    async fn save_pipeline_data_store(
        &self,
        data_store: &PipelineDataStoreInputModel,
    ) -> Result<(), IoTBeeError>;
    async fn get_pipeline_data_store(
        &self,
    ) -> Result<Vec<PipelineDataStoreOutputModel>, IoTBeeError>;
    async fn get_pipeline_data_store_by_id(
        &self,
        data_store_id: &DataStoreId,
    ) -> Result<Option<PipelineDataStoreOutputModel>, IoTBeeError>;
}

#[async_trait]
pub trait PipelineControllerRepository {
    async fn save_pipeline(&self, pipeline: &PipelineDataInputModel) -> Result<(), IoTBeeError>;
    async fn get_pipeline(&self) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError>;
    async fn get_pipeline_by_id(
        &self,
        pipeline_id: &DataStoreId,
    ) -> Result<Option<PipelineDataOutputModel>, IoTBeeError>;
    async fn get_pipeline_state_by_id(
        &self,
        pipeline_id: &DataStoreId,
    ) -> Result<Option<bool>, IoTBeeError>;

    async fn update_pipeline_state(
        &self,
        pipeline_id: &DataStoreId,
        is_active: bool,
    ) -> Result<(), IoTBeeError>;
    //TODO:controlar el ciclo de vida del pipeline cuando se realiza un update
    // async fn update_pipeline();
    //TODO:controlar el ciclo de vida del pipeline cuando se realiza un delete
    async fn delete_pipeline_by_id(&self, pipeline_id: &DataStoreId) -> Result<(), IoTBeeError>;
    async fn get_pipeline_by_group_id(
        &self,
        group_id: &DataStoreId,
    ) -> Result<Vec<PipelineDataOutputModel>, IoTBeeError>;
    async fn update_pipeline_data_source(
        &self,
        pipeline_id: &DataStoreId,
        data_source_id: &DataStoreId,
    ) -> Result<(), IoTBeeError>;
    async fn update_pipeline_data_store(
        &self,
        pipeline_id: &DataStoreId,
        data_store_id: &DataStoreId,
    ) -> Result<(), IoTBeeError>;
    async fn update_pipeline_validation_schema(
        &self,
        pipeline_id: &DataStoreId,
        validation_schema_id: &DataStoreId,
    ) -> Result<(), IoTBeeError>;
    async fn update_pipeline_group(
        &self,
        pipeline_id: &DataStoreId,
        group_id: &DataStoreId,
    ) -> Result<(), IoTBeeError>;
}
