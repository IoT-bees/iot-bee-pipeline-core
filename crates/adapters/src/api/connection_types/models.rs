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
