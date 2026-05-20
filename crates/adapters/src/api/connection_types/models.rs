use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct ConnectionTypeResponse {
    #[serde(rename = "sourceType")]
    pub source_type: String,
}

impl From<&'static str> for ConnectionTypeResponse {
    fn from(source_type: &'static str) -> Self {
        ConnectionTypeResponse {
            source_type: source_type.to_string(),
        }
    }
}

#[derive(Serialize, ToSchema)]
pub struct StoreTypesResponse {
    #[serde(rename = "connectionTypes")]
    pub connection_types: Vec<ConnectionTypeResponse>,
}

impl From<Vec<&'static str>> for StoreTypesResponse {
    fn from(source_types: Vec<&'static str>) -> Self {
        let connection_types = source_types
            .into_iter()
            .map(ConnectionTypeResponse::from)
            .collect();
        StoreTypesResponse { connection_types }
    }
}
