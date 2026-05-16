use async_trait::async_trait;

use crate::error::PlanError;
use crate::plan::entities::plan::{NewPlan, Plan, UpdatePlan};

#[async_trait]
pub trait PlanRepository: Send + Sync {
    /// List both global plans (organization_id IS NULL) and custom plans for the given org.
    async fn list_visible_to(&self, organization_id: i64) -> Result<Vec<Plan>, PlanError>;

    /// List only global plans (organization_id IS NULL).
    async fn list_global(&self) -> Result<Vec<Plan>, PlanError>;

    async fn find_by_id(&self, id: i64) -> Result<Option<Plan>, PlanError>;

    /// Find the effective plan for `slug` given `organization_id`. Lookup order:
    ///   1. plan with (slug, organization_id) — a custom override
    ///   2. plan with (slug, NULL)            — the global plan
    ///   3. None if neither exists
    async fn find_effective(
        &self,
        slug: &str,
        organization_id: i64,
    ) -> Result<Option<Plan>, PlanError>;

    async fn create(&self, new_plan: NewPlan) -> Result<Plan, PlanError>;
    async fn update(&self, id: i64, patch: UpdatePlan) -> Result<Plan, PlanError>;
    async fn delete(&self, id: i64) -> Result<(), PlanError>;
}
