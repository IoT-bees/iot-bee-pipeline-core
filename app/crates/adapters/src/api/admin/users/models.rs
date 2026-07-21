use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

#[derive(Deserialize, IntoParams)]
pub struct AdminUsersListQuery {
    pub cursor: Option<i64>,
    pub limit: Option<i64>,
    pub q: Option<String>,
    pub status: Option<String>,
}

#[derive(Deserialize, ToSchema)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: String,
    pub role: String,
    #[serde(rename = "tempPassword")]
    pub temp_password: String,
}

#[derive(Deserialize, ToSchema, Default)]
pub struct PatchUserRequest {
    pub name: Option<String>,
    pub role: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "mustResetPassword")]
    pub must_reset_password: Option<bool>,
}

#[derive(Serialize, ToSchema)]
pub struct AdminUserResponse {
    pub id: i64,
    #[serde(rename = "organizationId")]
    pub organization_id: i64,
    pub email: String,
    pub name: String,
    pub role: String,
    pub status: String,
    #[serde(rename = "mustResetPassword")]
    pub must_reset_password: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Serialize, ToSchema)]
pub struct AdminUsersListResponse {
    pub items: Vec<AdminUserResponse>,
    #[serde(rename = "nextCursor")]
    pub next_cursor: Option<i64>,
}
