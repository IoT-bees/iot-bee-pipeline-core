use async_trait::async_trait;

use crate::auth::entities::user::{NewUser, User};
use crate::error::AuthError;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn count(&self) -> Result<i64, AuthError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, AuthError>;
    async fn find_by_id(&self, id: i64) -> Result<Option<User>, AuthError>;
    async fn create(&self, new_user: NewUser) -> Result<User, AuthError>;

    async fn list_by_org(&self, organization_id: i64) -> Result<Vec<User>, AuthError>;
    /// Página de usuarios para la administración. La implementación por
    /// defecto mantiene compatibles los repositorios de prueba; producción
    /// debe sobreescribirla para no materializar toda la organización.
    async fn list_by_org_page(
        &self,
        organization_id: i64,
        cursor: Option<i64>,
        limit: i64,
        search: Option<&str>,
        status: Option<&str>,
    ) -> Result<(Vec<User>, Option<i64>), AuthError> {
        let mut users = self.list_by_org(organization_id).await?;
        if let Some(search) = search.filter(|value| !value.trim().is_empty()) {
            let needle = search.to_lowercase();
            users.retain(|user| {
                user.email.to_lowercase().contains(&needle)
                    || user.name.to_lowercase().contains(&needle)
            });
        }
        if let Some(status) = status {
            users.retain(|user| user.status == status);
        }
        if let Some(cursor) = cursor {
            users.retain(|user| user.id < cursor);
        }
        let limit = limit.clamp(1, 200) as usize;
        let has_next_page = users.len() > limit;
        users.truncate(limit);
        let next_cursor = has_next_page
            .then(|| users.last().map(|user| user.id))
            .flatten();
        Ok((users, next_cursor))
    }
    async fn find_admin_by_org_id(&self, organization_id: i64) -> Result<Option<User>, AuthError>;
    async fn update_role(&self, id: i64, role: &str) -> Result<(), AuthError>;
    async fn set_status(&self, id: i64, status: &str) -> Result<(), AuthError>;
    async fn update_name(&self, id: i64, name: &str) -> Result<(), AuthError>;
    async fn set_must_reset_password(&self, id: i64, must_reset: bool) -> Result<(), AuthError>;
    async fn create_as_admin(&self, new_user: NewUser) -> Result<User, AuthError>;
}
