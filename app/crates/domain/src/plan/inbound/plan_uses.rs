use async_trait::async_trait;

use crate::error::PlanError;
use crate::plan::entities::plan::{NewPlan, Plan, UpdatePlan};

#[async_trait]
pub trait PlanUseCases: Send + Sync {
    async fn list(&self, organization_id: i64) -> Result<Vec<Plan>, PlanError>;
    async fn create(&self, input: NewPlan) -> Result<Plan, PlanError>;
    async fn update(&self, id: i64, patch: UpdatePlan) -> Result<Plan, PlanError>;
    async fn delete(&self, id: i64) -> Result<(), PlanError>;
}
