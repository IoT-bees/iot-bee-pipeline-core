use sqlx::FromRow;

#[derive(FromRow)]
pub struct ValidationSchemaRow {
    pub json_name: String,
    pub json_schema: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct ValidationSchemaRowWhitId {
    pub id: u32,
    pub json_name: String,
    pub json_schema: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct ConnectionTypeRow {
    pub id: u32,
    pub connection_type: String,
}

#[derive(FromRow)]
pub struct DataSourceRow {
    pub id: u32,
    pub name: String,
    pub data_source_state: String,
    pub data_source_configuration: String,
    pub data_source_description: String,
    pub source_type: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct PipelineGroupRow {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct DataStoreRow {
    pub id: u32,
    pub name: String,
    pub store_type: String,
    pub json_schema: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(FromRow)]
pub struct PipelineRowFlat {
    pub id: u32,
    pub name: String,

    pub group_id: u32,
    pub group_name: String,

    pub db_id: u32,
    pub db_name: String,

    pub data_source_id: u32,
    pub data_source_name: String,

    pub validation_schema_id: u32,
    pub validation_schema_name: String,

    pub replicas: u32,
    pub status: bool,
    pub created_at: String,
    pub updated_at: String,
}
