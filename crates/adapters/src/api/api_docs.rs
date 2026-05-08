use utoipa::OpenApi;

//MODELS
//valiation schemas
use crate::api::connection_types::models::ConnectionTypeResponse;
use crate::api::data_sources::models::{
    CreateDataSourceRequest, DataSourceId, DataSourceResponse, UpdateDataSourceNameRequest,
    UpdateDataSourceRequest,
};
use crate::api::data_store::models::{CreateDataStoreRequest, DataStoreId, DataStoreResponse};
use crate::api::pipeline_data::models::{
    CreatePipelineDataRequest, PipelineDataId, PipelineDataResponse,
};
use crate::api::pipeline_groups::models::{CreateGroupRequest, GroupId, GroupResponse};
use crate::api::validation_schemas::models::{
    CreateValidationSchemaRequest, UpdateValidationSchemaRequestJson,
    UpdateValidationSchemaRequestName, ValidationSchemaByIdResponse, ValidationSchemaResponse,
};

 

//ROUTERS
use crate::api::connection_types::routers as connection_routers;
use crate::api::data_sources::routers as data_sources_routers;
use crate::api::data_store::routers as data_store_routers;
use crate::api::pipeline_data::routers as pipeline_data_routers;
use crate::api::pipeline_groups::routers as pipeline_groups_routers;
use crate::api::validation_schemas::routers as validation_routers;
use crate::api::pipeline_lifecycle::routers as pipeline_lifecycle_routers;

#[derive(OpenApi)]
#[openapi(
    paths(
        //validation schemas
        validation_routers::create_validation_schema,
        validation_routers::get_validation_schema,
        validation_routers::list_validation_schemas,
        validation_routers::update_validation_schema,
        validation_routers::update_validation_schema_json,
        validation_routers::delete_validation_schema,
        //connection types
        connection_routers::get_connection_types,
        //data sources
        data_sources_routers::create_data_source,
        data_sources_routers::get_data_source,
        data_sources_routers::list_data_sources,
        data_sources_routers::update_data_source_name,
        data_sources_routers::update_data_source,
        //pipeline groups
        pipeline_groups_routers::create_pipeline_group,
        pipeline_groups_routers::get_pipeline_groups,
        pipeline_groups_routers::get_pipeline_group_by_id,
        //data stores
        data_store_routers::create_data_store,
        data_store_routers::get_data_store,
        data_store_routers::list_data_stores,
        //pipeline data
        pipeline_data_routers::create_pipeline_data,
        pipeline_data_routers::get_pipeline_data,
        pipeline_data_routers::get_pipeline_data_by_id,
        // pipeline lifecycle
        pipeline_lifecycle_routers::start_new_pipeline,
        pipeline_lifecycle_routers::stop_pipeline
    ),
    components(
        schemas(
            CreateValidationSchemaRequest,
            UpdateValidationSchemaRequestName,
            UpdateValidationSchemaRequestJson,
            ValidationSchemaResponse,
            ValidationSchemaByIdResponse,
            ConnectionTypeResponse,
            CreateDataSourceRequest,
            UpdateDataSourceRequest,
            CreatePipelineDataRequest,
            PipelineDataResponse,
            PipelineDataId,
            DataSourceResponse,
            DataSourceId,
            CreateGroupRequest,
            GroupResponse,
            GroupId,
            CreateDataStoreRequest,
            DataStoreResponse,
            DataStoreId,
            UpdateDataSourceNameRequest,
        )
    ),
    tags(
        (name = "Validation Schemas", description = "CRUD operations for pipeline validation schemas"),
        (name = "Connection Types", description = "Endpoint to get all connection types"),
        (name = "Data Sources", description = "CRUD operations for data sources"),
        (name = "Pipeline Groups", description = "CRUD operations for pipeline groups"),
        (name = "Data Stores", description = "CRUD operations for data stores"),
        (name = "Pipeline Data", description = "CRUD operations for pipeline data")
    )
)]
pub struct ApiDoc;
