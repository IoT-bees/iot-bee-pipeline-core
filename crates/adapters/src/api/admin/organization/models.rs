use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema, Default)]
pub struct PatchOrganizationRequest {
    pub name: Option<String>,
    pub slug: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct OrganizationResponse {
    pub id: i64,
    pub name: String,
    pub slug: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
